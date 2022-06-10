const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const uuidv1 = require('uuid/v1');
const fs = require('fs');
const { Socket } = require('dgram');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let dataRaw = '';

    req.on('data', (chunk) => (dataRaw += chunk));
    req.on('error', reject);
    req.on('end', () => resolve(JSON.parse(dataRaw)));
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (/\/photos\/.+\.png/.test(req.url)) {
      const [, imageName] = req.url.match(/\/photos\/(.+\.png)/) || [];
      const fallBackPath = path.resolve(__dirname, '../no-photo.png');
      const filePath = path.resolve(__dirname, '../photos', imageName);

      if (fs.existsSync(filePath)) {
        return fs.createReadStream(filePath).pipe(res);
      } else {
        return fs.createReadStream(fallBackPath).pipe(res);
      }
    } else if (req.url.endsWith('/upload-photo')) {
      const body = await readBody(req);
      const name = body.name.replace(/\.\.\/|\//, '');
      const [, content] = body.image.match(/data:image\/.+?;base64,(.+)/) || [];
      const filePath = path.resolve(__dirname, '../photos', `${name}.png`);

      if (name && content) {
        fs.writeFileSync(filePath, content, 'base64');

        broadcast(connections, { type: 'photo-changed', data: { name } });
      } else {
        return res.end('fail');
      }
    }

    res.end('ok');
  } catch (e) {
    console.error(e);
    res.end('fail');
  }
});

// const wss = new WebSocket.Server({ port: 5501 });
const wss = new WebSocket.Server({ server });

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
      case 'IMAGE_DATA':
        const userWIthAvatar = request.payload;
        // for (const item of usersList) {
        //   if (item.id === userWIthAvatar.id) {
        //     item.avatar = userWIthAvatar.avatar;
        //   }
        //   setAvatar();
        // }
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

function broadcast(connections, message) {
  for (const connection of connections.keys()) {
    connection.send(JSON.stringify(message));
  }
}
server.listen(5501);
