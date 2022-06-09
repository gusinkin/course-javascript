import './client.html';
import './main.css';

const ws = new WebSocket('ws://localhost:5501');

const loginPage = document.querySelector('.login-page');
const chatPage = document.querySelector('.chat-page');
const loginForm = document.getElementById('loginForm');
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const messageForm = document.getElementById('messageForm');
// const sendButton = document.getElementById('sendButton')
const userName = document.querySelector('.userName');
const usersList = document.querySelector('.usersList');
const messages = document.querySelector('.messages');

let user;

loginForm.addEventListener('submit', function userLogin(e) {
  e.preventDefault();
  const name = this.elements.name.value;

  const request = {
    type: 'LOGIN',
    payload: {
      login: name,
    },
  };
  ws.send(JSON.stringify(request));
  e.target.reset();
});

messageForm.addEventListener('submit', function sendMessage(e) {
  e.preventDefault();
  const message = this.elements.message.value;
  const request = {
    type: 'NEW_MESSAGE',
    payload: {
      author: user,
      message: message,
    },
  };
  e.target.reset();
  ws.send(JSON.stringify(request));
});

logoutButton.addEventListener('click', function userLogout(e) {
  e.preventDefault();
  const request = {
    type: 'LOGOUT',
    payload: user,
  };
  ws.send(JSON.stringify(request));
});

ws.onmessage = function (message) {
  const response = JSON.parse(message.data);
  switch (response.type) {
    case 'LOGIN_RESPONSE':
      user = response.payload;
      console.log(user);
      loginPage.classList.add('hidden');
      chatPage.classList.remove('hidden');
      userName.textContent = user.name;

      break;
    case 'LOGOUT_RESPONSE':
      console.log('Client disconnected');
      user = undefined;
      userName.textContent = '';
      loginPage.classList.remove('hidden');
      chatPage.classList.add('hidden');
      break;
    case 'USERS':
      usersList.innerHTML = '';
      const usersOnline = response.payload.users;
      for (const item of usersOnline) {
        const nameDiv = document.createElement('div');
        nameDiv.innerHTML = item.name;
        usersList.append(nameDiv);
      }
      break;
    case 'MESSAGE':
      const messageText = response.payload.message;
      const authorName = response.payload.author.name;
      const message = document.createElement('div');
      message.classList.add('message');
      message.innerHTML = `<strong>${authorName}:</strong> ${messageText}`;

      messages.append(message);
      break;
    case 'NEW_USER':
      const name = response.payload.name;
      const newUser = document.createElement('div');
      newUser.classList.add('system-message');
      newUser.innerHTML = `${name} присоединился к чату`;

      messages.append(newUser);
      break;
    case 'USER_LEFT':
      const nameLeft = response.payload.name;
      const userLeft = document.createElement('div');
      newUser.classList.add('system-message');
      userLeft.innerHTML = `${nameLeft} покинул чат`;

      messages.append(userLeft);
      break;
  }
};
