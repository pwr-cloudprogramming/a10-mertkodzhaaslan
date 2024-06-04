document.addEventListener('DOMContentLoaded', () => {
    const authDiv = document.querySelector('.auth');
    const frontPageDiv = document.querySelector('.front-page');
    const gameDiv = document.querySelector('.board');
  
    const showAuth = () => {
      authDiv.style.display = 'block';
      frontPageDiv.style.display = 'none';
      gameDiv.style.display = 'none';
    };
  
    const showFrontPage = () => {
      authDiv.style.display = 'none';
      frontPageDiv.style.display = 'block';
      gameDiv.style.display = 'none';
    };
  
    const showGame = () => {
      authDiv.style.display = 'none';
      frontPageDiv.style.display = 'none';
      gameDiv.style.display = 'block';
    };
  
    showAuth();
  
    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      try {
        const response = await fetch('/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
        const message = await response.text();
        alert(message);
      } catch (err) {
        alert(`Error during registration: ${err.message}`);
      }
    });
  
    document.getElementById('verify-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('verify-email').value;
      const code = document.getElementById('verify-code').value;
      try {
        const response = await fetch('/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, code }),
        });
        const message = await response.text();
        alert(message);
      } catch (err) {
        alert(`Error during verification: ${err.message}`);
      }
    });
  
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      try {
        const response = await fetch('/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }
        const data = await response.json();
        localStorage.setItem('accessToken', data.AccessToken);
        localStorage.setItem('refreshToken', data.RefreshToken);
        localStorage.setItem('email', email);
        showFrontPage();
      } catch (err) {
        alert(`Error during login: ${err.message}`);
      }
    });
  
    const P1 = 'X', P2 = 'O';
    const socket = io.connect('/');
    let currentTurn;
    let playerType;
    let groupID;
    let board = [['', '', ''], ['', '', ''], ['', '', '']];
    let username;
  
    document.getElementById('start').addEventListener('click', () => {
      username = localStorage.getItem('email');
      if (!username) {
        alert('Please login.');
        return;
      }
      socket.emit('startGame', { name: username });
      playerType = P1;
    });
  
    document.getElementById('join').addEventListener('click', () => {
      groupID = document.getElementById('group').value;
      username = localStorage.getItem('email');
      if (!groupID || !username) {
        alert('ENTER THE ID AND LOG IN');
        return;
      }
      socket.emit('joinGame', { name: username, group: groupID });
      playerType = P2;
      showLogoutButton();
    });
  
    socket.on('new', (data) => {
      groupID = data.group;
      showGame();
      document.getElementById('greeting').innerHTML = `Group ${data.group} - ${data.name}.<span id="disappear"> <br><br/>  ID  ${data.group}. Waiting opponent .</span>`;
      currentTurn = null;
    });
  
    socket.on('player2', (data) => {
      showGame();
      document.getElementById('greeting').textContent = `Welcome ${data.name}`;
      currentTurn = false;
      document.getElementById('turn').textContent = 'Waiting the opponent!';
    });
  
    socket.on('player1', () => {
      document.getElementById('disappear').remove();
      currentTurn = true;
      document.getElementById('turn').textContent = 'Your turn!';
    });
  
    socket.on('toNext', (data) => {
      const opponentType = playerType === P1 ? P2 : P1;
      document.getElementById(data.box).textContent = opponentType;
      document.getElementById(data.box).disabled = true;
      const row = data.box.split('_')[1][0];
      const col = data.box.split('_')[1][1];
      board[row][col] = opponentType;
      currentTurn = true;
      document.getElementById('turn').textContent = 'Your turn!';
    });
  
    socket.on('err', (data) => {
      alert(data.message);
    });
  
    socket.on('resetGame', () => {
      setTimeout(() => {
        window.location.reload(true);
      }, 100);
    });
  
    socket.on('endGame', (data) => {
      if (data.message === 'Game Tied!') {
        document.getElementById('turn').textContent = data.message;
      } else if (data.winner === username) {
        document.getElementById('turn').textContent = 'WIN GG!';
      } else {
        document.getElementById('turn').textContent = 'LOST GL!';
      }
      document.querySelectorAll('.box').forEach(box => {
        box.disabled = true;
        box.removeEventListener('click', handleBoxClick);
      });
    });
  
    document.getElementById('reset').addEventListener('click', () => {
      socket.emit('reset', { group: groupID });
    });
  
    window.onbeforeunload = () => {
      socket.emit('reset', { group: groupID });
    };
  
    const handleBoxClick = (e) => {
      const target = e.target;
      if (target.disabled) {
        alert('Choose empty square!');
        return;
      }
      if (currentTurn == null) {
        alert('Your opponent has joined!');
        return;
      }
      if (!currentTurn) {
        alert('Not your turn!');
        return;
      }
      const box = target.id;
      const turnObj = {
        box,
        group: groupID,
      };
      socket.emit('nextTurn', turnObj);
      const row = box.split('_')[1][0];
      const col = box.split('_')[1][1];
      board[row][col] = playerType;
      currentTurn = false;
      document.getElementById('turn').textContent = 'Waiting your opponent...';
      target.textContent = playerType;
      target.disabled = true;
      let tied = true;
      for (let i = 0; i < 3; i++) {
        if (
          (board[i][0] === playerType && board[i][1] === playerType && board[i][2] === playerType) ||
          (board[0][i] === playerType && board[1][i] === playerType && board[2][i] === playerType)
        ) {
          tied = reportWin();
        }
      }
      if (
        (board[0][0] === playerType && board[1][1] === playerType && board[2][2] === playerType) ||
        (board[2][0] === playerType && board[1][1] === playerType && board[0][2] === playerType)
      ) {
        tied = reportWin();
      }
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (board[i][j] === '') {
            tied = false;
          }
        }
      }
      checkTie(tied);
    };
  
    document.querySelectorAll('.box').forEach(box => {
      box.addEventListener('click', handleBoxClick);
    });
  
    document.getElementById('logout').addEventListener('click', () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('email');
      alert('Logged out!');
      showAuth();
    });
  
    const checkTie = (tied) => {
      if (tied) {
        socket.emit('gameOver', { group: groupID, message: 'TIE!' });
        document.getElementById('turn').textContent = 'TIE!';
        endGame();
      }
    };
  
    const reportWin = () => {
      socket.emit('gameOver', { group: groupID, winner: username });
      document.getElementById('turn').textContent = 'WON';
      endGame();
      return true;
    };
  
    const showLogoutButton = () => {
      const logoutButton = document.getElementById('logout');
      logoutButton.style.display = 'block';
    };
  
    const hideLogoutButton = () => {
      const logoutButton = document.getElementById('logout');
      logoutButton.style.display = 'none';
    };
  
    const handleLogout = () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('email');
      alert('LOGGED OUT!');
      showAuth();
      hideLogoutButton();
    };
  
    const refreshToken = async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return;
  
      try {
        const response = await fetch('/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });
  
        if (!response.ok) {
          throw new Error('Failed to refresh token');
        }
  
        const data = await response.json();
        localStorage.setItem('accessToken', data.AccessToken);
      } catch (err) {
        console.error('Error refreshing token:', err);
      }
    };
  
    setInterval(refreshToken, 15 * 60 * 1000);
  
    const endGame = () => {
      document.querySelectorAll('.box').forEach(box => {
        box.disabled = true;
        box.removeEventListener('click', handleBoxClick);
      });
    };
  });
  
