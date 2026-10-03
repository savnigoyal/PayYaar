# PayYaar

PayYaar is a browser-based expense and room-operations app for hostel groups and roommates. Shared expenses, physical inventory, personal IOUs, the real room fund, settlements, and activity are kept in separate workflows.

## Features

- Add room members and prevent duplicate names.
- Record one shared expense with a payer and selected equal-split members.
- Calculate each person's share and suggest a minimum-transfer settlement plan.
- Track physical shared stock without creating roommate debts.
- Record personal money/item IOUs with borrower, lender, optional due date, and repayment status.
- Track actual Room Wallet contributions and withdrawals separately from shared expenses.
- Review a chronological, read-only activity log.
- Save app data in browser local storage; Firebase is used for authentication only.
- Responsive layout for laptop, tablet, and mobile.

## How It Works

1. Add roommates from the Hostel overview.
2. Record shared purchases in **Expenses**, selecting the payer and who shares the cost.
3. Use **Common Stock** for quantities and item consumption, not debts.
4. Use **IOUs** only for personal borrowing; use **Room Wallet** only for money actually entering or leaving the shared fund.
5. Review suggested transfers in **Settle Up**. After paying outside PayYaar, confirm the payment so balances recalculate.

## Expense Splitting Logic

PayYaar uses unique member names while splitting expenses. If the same person is accidentally added more than once in older saved data, the app removes duplicates while calculating shares and balances.

Example:

If `₹15000` is split between `Savni`, `Sharad`, `Samyak`, and `Sujata`, each person pays:

```text
15000 / 4 = ₹3750
```

## Tech Stack

- HTML
- CSS
- JavaScript
- Firebase Authentication for sign-in
- Browser localStorage for room members, expenses, stock, IOUs, wallet transactions, settlements, bills, and activity

## Project Files

```text
PayYaar/
├── index.html
├── style.css
├── script.js
├── firebase-config.js
├── logo.png
└── README.md
```

## Run Locally

Email/password sign-in requires Firebase project settings in `firebase-config.js`. To enable it:

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/) and add a Web app.
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. In **Authentication → Settings → Authorized domains**, add the host you'll use (for local testing, usually `localhost`).
4. Copy the Web app config into `firebase-config.js`, replacing every `YOUR_...` value.
5. Serve the folder over HTTP; opening `index.html` with `file://` may block Firebase module imports and authentication.

The Firebase web config is not a secret, but restrict its API key in Google Cloud and configure appropriate Firebase Security Rules before using production data.

To start a local development server, use:

```bash
npx serve .
```

Then open the local URL shown in the terminal.

## Notes

- App records are stored locally in this browser; Firebase currently provides authentication only. There is no Firestore/database synchronization or shared cross-device room store in this project.
- Roommate settlement records reflect payments the user confirms after paying externally. PayYaar does not process UPI or cash payments.
- Room Wallet withdrawals are not added to the shared-expense ledger. Wallet-funded IOU repayments are linked to one wallet transaction.
- Reset Room Data removes only PayYaar localStorage keys and preserves unrelated data for this site.

## Author

Made by Savni Goyal.
