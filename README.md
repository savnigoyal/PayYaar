# PayYaar

PayYaar is a simple expense-splitting web app made for hostel groups, roommates, friends, and small shared-expense circles. It helps users create a group, add friends, record expenses, split bills between selected members, track total spending, set a group budget, and see who owes whom.

## Features

- Create an expense group.
- Add friends to the group.
- Prevent duplicate friend names.
- Add expenses with title, amount, payer, and split members.
- Split an expense between all members or selected members.
- Calculate each person's share automatically.
- Show simplified balances, such as `Savni owes Sharad ₹6250`.
- Track total group expenses.
- Set a group budget and see budget warnings.
- Save friends and expenses in browser local storage.
- Responsive layout for laptop, tablet, and mobile.

## How It Works

1. Add all group members in the **Add Friend** section.
2. Add an expense by entering the expense title and amount.
3. Select who paid for the expense.
4. Choose how to split it:
   - Select **All** to split between every member.
   - Or select individual members manually.
5. Click **Add Expense**.
6. PayYaar updates the expense history, total expenses, and balances automatically.

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
- Firebase Firestore for group creation
- Browser localStorage for friends and expenses

## Project Files

```text
PayYaar/
├── index.html
├── style.css
├── script.js
├── logo.png
└── README.md
```

## Run Locally

You can run the project by opening `index.html` directly in a browser.

For a local development server, you can also use:

```bash
npx serve .
```

Then open the local URL shown in the terminal.

## Notes

- Expense data is stored in the user's browser using localStorage.
- Clearing browser storage will remove saved friends and expenses.
- Group creation uses Firebase Firestore.

## Author

Made by Savni Goyal.
