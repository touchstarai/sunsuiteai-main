import { showProgress, removeProgress } from './reusables/showProgressBtn.js';
import { showAlert } from './reusables/alert.js';
import showError from './reusables/showError.js';

const btnUpdate = document.querySelector('.btn-updateMe');
const emailIn = document.getElementById('email-update');
const nameIn = document.getElementById('name-update');

export default async function (e) {
  try {
    const user = JSON.parse(document.querySelector('.profile-settings').dataset.user);
    e.preventDefault();
    const email = emailIn.value.trim() || user.email;
    const name = nameIn.value.trim() || user.name;

    showProgress(btnUpdate);
    await axios.post(`/api/v1/users/updateMe`, { email, name });
    showAlert('success', 'Update successful.');

    removeProgress(btnUpdate, 'Updated');

    setTimeout(() => {
      location.reload(true);
    }, 3000);
  } catch (err) {
    showError(err, btnUpdate, 'Save');
  }
}
