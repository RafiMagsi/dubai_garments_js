# AI Sales Agent — Day 20 End-to-End Checklist

## Flow under test
Lead -> Reply Studio -> Quote Copilot

## Preconditions
- Admin session is active
- A valid lead exists
- Optional deal/quote records exist for richer context

## Scenario A — Reply Studio from lead context
1. Open AI Sales Agent
2. Open Reply Studio tab
3. Enter a valid lead ID
4. Generate:
   - first reply
   - follow-up reply
   - clarification questions
5. Confirm:
   - draft renders
   - rationale renders
   - suggested next action renders
   - confidence renders
   - fallback/provider messaging is visible

## Scenario B — Quote Copilot from same lead
1. Open Quote Copilot tab
2. Use the same lead ID
3. Run Quote Recommendation
4. Confirm:
   - recommendations render
   - quantity / variant suggestions render
   - missing-data checks render
5. Accept at least one recommendation
6. Generate Quote Copilot summary
7. Confirm:
   - summary renders
   - accepted count renders
   - upsell/cross-sell renders

## Scenario C — Trust / fallback checks
1. Confirm fallback/provider messaging appears in Reply Studio
2. Confirm fallback/provider messaging appears in Quote Copilot
3. Confirm no empty-state crash occurs when lead lacks detail

## Pass criteria
- User can move from lead context to messaging to quote assistance without leaving AI Sales Agent
- Every stage returns visible trust messaging
- No runtime errors