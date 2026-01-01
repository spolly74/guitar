# Schemas

## Plan JSON Schema (v1.0)
```json
{
  "version": "1.0",
  "date": "YYYY-MM-DD",
  "title": "string",
  "focus_prompt": "string",
  "assumptions": {
    "level": "beginner",
    "daily_minutes_target": 30,
    "instrument": "right-handed 6-string guitar",
    "tuning": "EADGBE"
  },
  "today_blocks": [],
  "review_logic": {
    "include_open_followups": true,
    "prefer_recent_days": 7
  },
  "sources": []
}
```

## Fretboard Diagram Spec
```json
{
  "type": "fretboard",
  "style": "jazz-clean-v1",
  "title": "string",
  "tuning": ["E2","A2","D3","G3","B3","E4"],
  "fret_range": [0, 12],
  "markers": [],
  "show_fret_numbers": true,
  "color_by_role": true
}
```

