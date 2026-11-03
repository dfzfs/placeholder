# Quick Placeholder Switcher

SillyTavern extension for overriding only `{{char}}` and `{{user}}` in the current chat.

## Install
1. Copy the `quick-placeholder-switcher` folder into `SillyTavern/public/scripts/extensions/third-party/`.
2. In SillyTavern, open Extensions and enable/reload the extension.
3. Open the extension panel to choose the character and user placeholders.

## Included
- Select a character name for `{{char}}`.
- Select an available persona for `{{user}}` when the persona selector is present.
- Show the currently applied names.
- Apply/reset overrides for the current chat.
- Save, load, and delete reusable character/user combinations.

Overrides are stored in current chat metadata. Saved combinations are stored in extension settings. No chat messages or character cards are edited.
