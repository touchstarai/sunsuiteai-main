import showError from './reusables/showError.js';
import { showAlert } from './reusables/alert.js';
import { showProgress, removeProgress } from './reusables/showProgressBtn.js';

async function handleSignup(e) {
  const btn = document.getElementById('btn-signup');
  const modal = new bootstrap.Modal(document.getElementById('registerlogin'));
  try {
    e.preventDefault();

    const dataObj = {};

    const inputFields = document.querySelectorAll("input:not([type='checkbox])");
    for (const inpt of inputFields) {
      if (inpt.name === 'emailConfirm') continue;

      dataObj[inpt.name] = inpt.value;
    }

    showProgress(btn);

    const { data } = await axios({
      method: 'post',
      url: '/api/v1/users/signup',
      data: dataObj,
    });

    removeProgress(btn, 'Success');
    modal.show();

    showAlert('primary', 'Success. Enjoy our website.');

    // REDIRECT
    setTimeout(() => {
      modal.hide();
      location.assign('/login');
    }, 2000);
  } catch (err) {
    showError(err, btn, 'REGISTER NOW!');
  }
}

export default handleSignup;
