import showError from './reusables/showError.js';
import { showAlert } from './reusables/alert.js';
import { showProgress, removeProgress } from './reusables/showProgressBtn.js';

export async function handleLogin(e) {
  const btn = document.querySelector('.btn-loginnow');
  try {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    // Show progress on the button
    showProgress(btn);

    const { data } = await axios({
      method: 'post',
      url: '/api/v1/users/login',
      data: { email, password },
    });

    showAlert('success', 'You are logged in successfully.');

    setTimeout(() => {
      location.assign('/');
    }, 2000);
  } catch (err) {
    showError(err, btn, 'Login');
  }
}

export async function handleLogout(e) {
  try {
    e.preventDefault();
    showProgress(e.target);
    await axios({ method: 'get', url: '/api/v1/users/logout' });

    setTimeout(() => {
      location.assign('/');
    }, 2000);
  } catch (err) {
    showError(err, e.target, 'Logout');
  }
}
