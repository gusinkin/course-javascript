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
const userPhoto = document.querySelector('[data-role=user-photo]');

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

userPhoto.addEventListener('dragover', (e) => {
  if (e.dataTransfer.items.length && e.dataTransfer.items[0].kind === 'file') {
    e.preventDefault();
  }
});
userPhoto.addEventListener('drop', (e) => {
  const file = e.dataTransfer.items[0].getAsFile();
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.addEventListener('load', () => {
    userPhoto.onUpload(reader.result);
    // Загрузить на сервер
    // console.log(reader.result);
  });
  userPhoto.style.backgroundImage = `url(${reader.result})`;
  e.preventDefault();
});

userPhoto.onUpload = onUpload;
function onUpload(data) {
  console.log(user.name);
  fetch('/chat/upload-photo', {
    method: 'post',
    body: JSON.stringify({
      name: user.name,
      image: data,
    }),
  });
  user.avatar = data;
  // const imageData = {
  //   type: 'IMAGE_DATA',
  //   payload: user,
  // };
  // ws.send(JSON.stringify(imageData));
  // const image = new Image();
  // image.src = data;
  // userPhoto.appendChild(image);
}

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
      // message.innerHTML = `<strong>${authorName}:</strong> ${messageText}`;
      message.innerHTML = `<div class="userAvatar" data-role="user-avatar" data-user="${authorName}"></div>
      <div class="message__data">
        <div class="message__author">${authorName}</div>
        <div class="message__text">${messageText}</div>
      </div>`;

      messages.append(message);
      break;
    case 'NEW_USER':
      const name = response.payload.name;
      const newUser = document.createElement('div');
      newUser.classList.add('system-message');
      newUser.innerHTML = `<b>${name}</b> присоединился к чату`;

      messages.append(newUser);
      break;
    case 'USER_LEFT':
      const nameLeft = response.payload.name;
      const userLeft = document.createElement('div');
      userLeft.classList.add('system-message');
      userLeft.innerHTML = `<b>${nameLeft}</b> покинул чат`;

      messages.append(userLeft);
      break;
    case 'photo-changed':
      const data = response.data;
      const avatars = document.querySelectorAll(
        `[data-role=user-avatar][data-user=${data.name}]`
      );

      for (const avatar of avatars) {
        avatar.style.backgroundImage = `url(/chat/photos/${
          data.name
        }.png?t=${Date.now()})`;
      }
  }
};
