# Diggy Deposits (v2.2)

A lightweight, privacy-focused utility for Torn.com designed to streamline money management and help users avoid being a high-value target for muggers.

---

## Features

* **Integrated UI:** Eliminates floating icons by transforming the native Money Bar in the header into a functional button.
* **One-Click Navigation:** Left-click the money balance to instantly navigate to the Property Vault or Faction Armory.
* **Visual Danger Alerts:** The money bar pulses red with a glowing animation whenever the balance exceeds the user-defined limit.
* **Customizable Audio:** * 1 Beep: Signals a change in the wallet amount.
    * 2 Beeps: Signals the balance is over the safety limit.
    * Individual toggles for each beep type are available in the settings.
* **Privacy Focused:** All settings are stored locally in the browser via localStorage. The script does not use APIs, tracking, or external data transmission.
* **Quick Access Settings:** Right-click (PC) or Long-press (Mobile) the money bar to open the configuration menu.

---

## Installation

1. Install a userscript manager such as Tampermonkey or Violentmonkey.
2. Create a new script in the manager.
3. Paste the code from DiggyDeposits.user.js into the editor.
4. Save the script and refresh the Torn website.

---

## Configuration Options

* **Volume:** Adjust beep intensity from 0% to 100%.
* **Toggle Beeps:** Independently enable or disable Change beeps and Danger beeps.
* **Danger Limit:** Set a custom threshold using shorthand notation (e.g., 10m, 5b, 500k).
* **Deposit Target:** Select the destination for the one-click navigation (Property Vault or Faction Armory).

---

## Rules and Compliance

This script is a UI (User Interface) enhancement. It does not automate gameplay actions, interact with the Torn API, or perform background tasks without user input. It adheres to the "One Action per Click" philosophy by acting as a dynamic bookmark and a visual/audio notifier. Use at your own risk and in accordance with current game rules.
