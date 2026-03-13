# Gemini Wave Intake Template

Use this template when bringing a Gemini response back into N1Hub for review.

The goal is to remove ambiguity before N1 review starts.

Copy this file, fill the fields, and append the Gemini response below the intake block.

```md
# Gemini Wave Intake

## Wave Metadata

- wave_label:
- review_date:
- gemini_model:
- response_file_name:

## Source Scope

- data_txt_slice:
- line_reference_mode:
  - file-global
  - raw-body-relative
  - unknown
- raw_sentinels_present:
  - yes
  - no

## Corpus Context Given To Gemini

- manifests:
- capsule_families:
- specific_capsules:
- docs_or_notes:
- prior_gemini_or_n1_notes:

## Operator Intent

- main_goal_for_this_wave:
- non_goals_for_this_wave:
- surfaces_to_treat_as_sensitive:
- primary_capsule_family_to_test:
- exact_missing_proposition_you_expect_or_suspect:

## Quick Operator Notes

- anything_gemini_felt_strong_on:
- anything_gemini_felt_uncertain_on:
- anything_you_want_n1_to_scrutinize:
- whether_you_expect_procedure_schedule_or_posture_confusion:

## Gemini Response

Paste Gemini's full response below this line.
```

## Intake Law

- Preserve Gemini's original section headers if possible.
- Do not pre-compress the answer before N1 sees it.
- If Gemini used YAML handoff, keep it intact.
- If Gemini omitted line-reference mode, mark it as `unknown` rather than guessing.
- If the wave used only a subset of the corpus, say so explicitly.
