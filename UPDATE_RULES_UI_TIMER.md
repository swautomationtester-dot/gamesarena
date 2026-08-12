# GamesArena Quiz UI / Rules / Timer Update

## Participant
- Removed the registered/waiting message from the active quiz view.
- Added participant Game Rules button in the lobby and active quiz.
- Added a KBC-inspired circular countdown timer on the right side of the participant question area.
- Timer is 30 seconds for Q1-Q4 and 60 seconds for Q5-Q10.
- Rules modal can be opened/closed locally by the participant.

## Host
- Added Show Game Rules / Close Game Rules control.
- Host rule state is authoritative and broadcasts to participant and TV.

## TV
- Added synchronized Game Rules modal. It opens when Host shows rules and closes when Host closes rules.

## Prize ladder
- Q1 ₹5
- Q2 ₹10
- Q3 ₹15
- Q4 ₹20
- Q5 ₹25 + ₹20 Safe Money available after Q4
- Q6 ₹30
- Q7 ₹35
- Q8 ₹40 + ₹40 Safe Money secured after Q8
- Q9 ₹45
- Q10 ₹50 Final
- Maximum prize ₹50

## Server
- Added `rulesVisible` to live room state.
- Added `host:showRules` and `host:closeRules` socket events.
- Safe Money server milestones remain enforced after Q4 and Q8.


## Shared Rules UI Update
- Host, Participant and TV now use the same Game Rules modal markup and visual treatment.
- Host Show/Close Rules remains authoritative through `rulesVisible` broadcast state.
- Participant and TV can close the panel locally; Host Close Rules closes it on all three screens.
