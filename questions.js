/* questions.js: questions Chengxuan asks her. They show as a card at the top of her Home page.
   {name} becomes a pet name. "until" (Barcelona time, optional): unanswered questions hide after this.
   Each option can have "reply": what she sees after picking it. "note": a placeholder = she can add a line. */
window.QUESTIONS = [
  {
    id: 'q-10things-1113',
    emoji: '🎬',
    text: 'Hey {name} 🥺 what time do you finish school today? If it\'s earlier than usual, like 3:30, could we watch 10 Things I Hate About You together at 4:30? 🍿',
    options: [
      { label: 'Yes! I finish at 3:30 🎉', reply: 'It\'s a date! 🍿 4:30, you and me and 10 Things I Hate About You 💚' },
      { label: 'I finish at the usual time 🥲', reply: 'Aww okay 🥺 We\'ll find another time for our movie date 💚' },
      { label: 'Another time (I\'ll write it) ✍️', reply: 'Got it! Chengxuan will see your time 💚' }
    ],
    note: 'What time do you finish? 🕒 (optional)',
    at: '2026-11-13T06:30',
    until: '2026-11-13T17:00'
  }
];
