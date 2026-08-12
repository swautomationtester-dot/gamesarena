# Card Match Participant New Room Fix

- Removed the New Room / New Card Game control from participant join/lobby screens.
- The lobby New Room control is now visible only to the Host/TV role.
- Added a server-side authorization guard so a participant cannot create a new card-match room by calling `cm:create` directly.
- Host room creation remains unchanged.
