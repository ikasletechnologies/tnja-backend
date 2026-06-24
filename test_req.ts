import http from 'http';

const req = http.request('http://localhost:5000/api/users/all?search=test', {
  headers: {
    // We need to pass a valid token. Since we don't have one, this will probably fail with 401.
    // Let's create a token.
  }
});
