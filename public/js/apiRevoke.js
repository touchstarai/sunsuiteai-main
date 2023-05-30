import showError from './reusables/showError.js';
import { showAlert } from './reusables/alert.js';
import { showProgress, removeProgress } from './reusables/showProgressBtn.js';
import makeRequest from './reusables/fetch.js';

const handleRevoke = async function (e) {
  const btnRevoke = e.target.closest('.btn-revoke');
  try {
    if (!btnRevoke) return;
    const chatId = btnRevoke.dataset.chatid;
    showProgress(btnRevoke);
    const data = await makeRequest({
      method: 'patch',
      url: `/api/v1/pdf/apikey/${chatId}`,
    });

    console.log(data);

    showAlert('success', data.message);
    removeProgress(btnRevoke, 'Done');

    setTimeout(() => {
      e.target.closest('.key-revoke-container').remove();
    }, 1000);
  } catch (err) {
    showError(err, btnRevoke, 'Revoke');
  }
};

export default handleRevoke;
