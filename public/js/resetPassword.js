import { showProgress, removeProgress } from './reusables/showProgressBtn.js';
import { showAlert } from './reusables/alert.js';
import showError from './reusables/showError.js';

const formReset = document.getElementById('form-reset');
const btnSet = document.querySelector('.btn-set');
const passwordIn = document.getElementById('password');
const passwordConfirmIn = document.getElementById('passwordConfirm');

formReset.addEventListener('submit', async (e) => {
  try {
    e.preventDefault();

    const password = passwordIn.value;
    const passwordConfirm = passwordConfirmIn.value;
    const token = e.target.dataset.token;

    if (password !== passwordConfirm)
      return showAlert('danger', 'Password has to be the same as passwordConfirm');

    showProgress(btnSet);
    await axios.post(`/api/v1/users/resetpassword/${token}`, {
      password,
      passwordConfirm,
    });
    btnSet.dsiabled = true;
    removeProgress(btnSet, 'Sett successful');
    showAlert('success', 'Password reset successful');

    setTimeout(() => {
      location.assign('/');
    }, 1200);
  } catch (err) {
    showError(err, btnSet, 'Set New');
  }
});
