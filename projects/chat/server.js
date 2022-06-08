const WebSocket = require('ws');
const uuidv1 = require('uuid/v1');
const fs = require('fs');
const { Socket } = require('dgram');
const wss = new WebSocket.Server({ port: 5501 });

const connections = new Map();

let usersList = [];
let usersOnline = [];
let response = {};

wss.on('connection', (ws) => {
  connections.set(ws, {});

  ws.on('message', function incoming(message) {
    const request = JSON.parse(message);
    switch (request.type) {
      case 'LOGIN':
        let user;
        for (const item of usersList) {
          if (item.name === request.payload.login) {
            user = item;
          }
        }
        if (!user) {
          const clientId = uuidv1();
          user = {
            name: request.payload.login,
            id: clientId,
            avatar: '',
          };
          connections.get(ws).userData = user;
          usersList.push(user);
        }
        usersOnline.push(user);
        response = {
          type: 'LOGIN_RESPONSE',
          payload: user,
        };
        ws.send(JSON.stringify(response));
        newUser(user.name);
        changeUsers(usersOnline);

        break;
      case 'LOGOUT':
        const userToDisconnect = {
          name: request.payload.name,
          id: request.payload.id,
        };
        usersOnline = usersOnline.filter((a) => {
          a.id !== userToDisconnect.id;
        });
        response = {
          type: 'LOGOUT_RESPONSE',
          payload: userToDisconnect,
        };
        userLeft(userToDisconnect.name);
        changeUsers(usersOnline);
        ws.send(JSON.stringify(response));
        break;
      case 'NEW_MESSAGE':
        const text = request.payload.message;
        const author = request.payload.author;
        sendMessage(author, text);
        break;
      default:
        console.log('Unknown response');
    }
  });
});

function newUser(user) {
  const message = {
    type: 'NEW_USER',
    payload: {
      name: user,
    },
  };
  for (const connection of connections.keys()) {
    connection.send(JSON.stringify(message));
  }
}

function userLeft(user) {
  const message = {
    type: 'USER_LEFT',
    payload: {
      name: user,
    },
  };
  for (const connection of connections.keys()) {
    connection.send(JSON.stringify(message));
  }
}

function changeUsers(users) {
  const message = {
    type: 'USERS',
    payload: {
      users: users,
    },
  };
  for (const connection of connections.keys()) {
    connection.send(JSON.stringify(message));
  }
}
function sendMessage(user, text) {
  const message = {
    type: 'MESSAGE',
    payload: {
      author: user,
      message: text,
    },
  };
  for (const connection of connections.keys()) {
    connection.send(JSON.stringify(message));
  }
}
