---
name: Vendor review
description: Runs a structured due-diligence review of a supplier or software vendor, tiered by how critical it is, with a weighted scorecard across security, privacy, financial health, contract, service and exit risk.
connectors: [google-drive]
triggers:
  - vendor review
  - supplier due diligence
  - should we use this vendor
  - third-party risk
  - vendor scorecard
  - compare these suppliers
---
# Vendor review

## Purpose
Help a buyer decide whether a vendor is fit to rely on, and on what terms, with effort proportional to the risk.

## Inputs to ask for
1. The vendor, the product or service, and what it will be used for.
2. Spend per year, contract length and how many users or processes depend on it.

## Method
1. **Tier the vendor** (tier 1 critical, tier 2 important, tier 3 low).
2. **Review each area** and score it 1 to 5 with the evidence.
3. **Weight the areas** by tier and compute the weighted score out of 5.
4. **Recommend** approve, approve with conditions, or reject.

## Output format
1. **Recommendation** with tier and weighted score.
2. **Scorecard:** Area, Weight, Score, Evidence, Gaps.

## Limits
The review relies on what the vendor and the user provide; it does not verify claims independently.
