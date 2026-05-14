# TRIBE v2 + BrainLM — R&D scaffold

Internal R&D plan for the Phase 2 ad evaluator. Replaces the LLM scorer
(`engine/eval/ad_eval_llm.mjs`) once the pipeline below is validated.

This document describes intent and architecture only. No implementation
in the current session.

---

## The thesis

LLM-based ad scoring (current Pass 5) inherits the biases of the
pretraining corpus. The model is good at recognizing patterns that
exist in caption / alt-text / review data, and weaker at predicting
how the brain actually responds to a creative — particularly on
attention capture and emotional valence, where caption data and
neural response diverge.

A neuro-foundation pipeline closes that gap by predicting the response
itself, not the language about the response.

The pipeline runs:

```
ad creative
    │
    ▼
TRIBE v2  (multimodal cortical encoder — image + video frames + audio)
    │
    ▼
fsaverage5 cortical surface activations
    │
    ▼
Glasser 360 ROI pool  (Human Connectome Project parcellation)
    │
    ▼
BrainLM  (transformer encoder pretrained on resting-state fMRI)
    │
    ▼
3-layer MLP head  (supervised on Siraj + competitor outcomes)
    │
    ▼
5 behavioral scores
```

---

## Component-by-component

### TRIBE v2
- **What it does.** Takes a multimodal stimulus (image, video, audio) and outputs predicted BOLD activations on the cortical surface in fsaverage5 geometry. Trained on the NSD + AlgonautsCC-2025 datasets plus Meta's internal advert response corpus.
- **Status.** Released by Meta FAIR in late 2025. Weights distributed under research-only license — Siraj's commercial deployment would need a license agreement or a fine-tuned replacement.
- **Input.** Up to 30s of video at 24fps, or a single image, plus optional audio track. Format-flexible.
- **Output.** fsaverage5 surface activations (10,242 vertices per hemisphere), one timeseries per TR (typically 1.5s).
- **Caveat.** Predictions are correlation-strong on the NSD validation set but degrade for stimuli outside the training distribution. Ads with novel visual grammar (e.g., TikTok-native vertical with rapid cuts) may underperform.

### fsaverage5 → Glasser 360 ROI pool
- **What it does.** Reduces vertex-level activations to ROI-level by averaging within each of the 360 cortical parcels defined by the Glasser et al. multi-modal parcellation. Cuts dimensionality by ~50× and stabilizes the signal.
- **Implementation.** Simple matrix multiplication once the vertex-to-parcel mapping is loaded (one-time setup from the HCP S1200 release).
- **Why.** Vertex-level signals are noisy. Parcel-level signals have established functional interpretations (V1 = early vision, FFA = face area, PCC = self-referential, etc.) which lets us inspect which regions drive each behavioral score.

### BrainLM
- **What it does.** A transformer encoder pretrained on millions of resting-state fMRI scans. Takes the ROI-pooled time-series and outputs a fixed-size embedding that captures connectivity patterns and dynamics.
- **Why use it instead of feeding ROIs directly to the MLP.** BrainLM's pretraining captures intersubject regularities the MLP would otherwise have to learn from scratch on a small supervised dataset.
- **Candidate checkpoint.** `facebook/BrainLM-base-1.3B-fsaverage5` (placeholder name — verify against actual HuggingFace release at integration time).

### 3-layer MLP head
- **What it does.** Maps BrainLM embedding → 5 behavioral scores. Trained supervised on labeled (creative, outcome) pairs.
- **Architecture.** 3 fully-connected layers, ReLU activation, batch norm, dropout 0.2. Output: 5-dim sigmoid scaled to 1-10.
- **Loss.** Mean squared error per score, weighted by score-specific reliability (purchase_intent has higher noise — weight it lower).

---

## Data plan

The supervised training data for the MLP head is the critical-path
constraint. We need creative → score pairs where the scores are
grounded in real outcomes, not LLM-imputed.

| Source | Volume | Outcome ground truth | Status |
|---|---|---|---|
| Siraj's own Meta ad-account history | ~40 ads (12 months) | Real ROAS, CTR, ATC rate | Available once Meta API token lands |
| Competitor public ads via Meta Ad Library | ~500 ads across 10 brands | LLM-imputed scores from Pass 5 (use sparingly — circular) | Available now (web_search) |
| Public ad-effectiveness datasets | Marketing Mix, Snap Visual Ad Library | Real outcomes | Need to request access |
| Synthetic / generated ads with controlled signals | ~200 | Synthetic outcomes by construction | Build internally |

Target dataset: ≥ 200 high-quality (creative, real outcome) pairs
before we ship the MLP head. Aug-Sep 2026 collection window.

---

## Phased plan

**Phase 2A — Validate against LLM (4 weeks)**
- Run TRIBE v2 + Glasser 360 pool + BrainLM on 20 ads.
- Compare BrainLM embeddings' pairwise distances to LLM-imputed scores.
- Goal: confirm the brain pipeline distinguishes ads that the LLM
  also distinguishes. If not, the pipeline is broken.

**Phase 2B — Collect supervised data (8 weeks)**
- Pull all historical Siraj ad performance once Meta API access is live.
- Label competitor ads with real outcomes wherever available.
- Hit the 200-pair threshold.

**Phase 2C — Train + validate (4 weeks)**
- Train the 3-layer MLP head on the dataset.
- Hold out 20% for validation.
- Goal: BrainLM-MLP predictions correlate r > 0.6 with held-out outcomes
  on each of the 5 behavioral signals. Below 0.4, abort and stick with LLM.

**Phase 2D — Production swap (2 weeks)**
- Swap `ad_eval_llm.mjs` for the Python evaluator in `engine/eval/`.
- Keep the LLM as a fallback for ads where TRIBE confidence is low.
- A/B test: which evaluator's recommendations produce better-performing
  Siraj creative in the 90 days after each.

---

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| TRIBE v2 license blocks commercial use | Medium | Fall back to fine-tuned variant trained on AlgonautsCC-2025 only |
| BrainLM checkpoint quality on the Glasser 360 geometry | Medium | Validate Phase 2A correlations early; pivot to direct ROI features if BrainLM underperforms |
| Insufficient supervised data | High | Synthetic augmentation. Worst case: ship Phase 2A only as a "second opinion" alongside LLM scores. |
| Out-of-distribution stimuli (vertical TikTok cuts, etc.) | Medium | Fine-tune TRIBE on a small annotated set of TikTok-native creatives. |
| Compute cost | Low | BrainLM inference is ~10ms per ad on a single A100; not a bottleneck. |

---

## Open questions

- Do we need per-persona MLP heads (Imani, Amira, Simone, Maya) or one
  general head with persona as a feature?
- How do we handle audio-heavy ads vs silent feed ads in the same
  pipeline? TRIBE v2 supports audio but its training corpus is
  vision-heavy.
- Is there value in running both evaluators in parallel and surfacing
  disagreement as a flag, rather than picking one winner?

---

## Out of scope for this scaffold

- Implementation. None of the pipeline is built; this is architecture
  + plan only. Phase 2 work is gated on review of this doc.
- Data collection. Begins when the Meta API token lands.
- License negotiations. Begins after Phase 2A correlation validation.
