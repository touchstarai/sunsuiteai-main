import generateResult from './reusables/fetch.js';
import { showProgress } from './reusables/showProgressBtn.js';
import showError from './reusables/showError.js';

const stripe = Stripe(
  'pk_test_51N3vRUI6PcUP2yt23fsOJGV3Lrye2if4wlzGLfzrmicWEg11VLidtiEzOPzABONLm1OEKjkoFSj6ac6X0WqJ1QNH00qGEUwygm'
);

const btnContinue = document.getElementById('btn-continue');
const modalPay = document.getElementById('modal-pay');

export default function handleGetStarted(e) {
  if (!e.target.closest('.btn-getStarted')) return;
  const planCard = e.target.closest('.card-pricing');
  const planName = planCard.dataset.planName;
  const label = document.getElementById('paymodal-label');
  modalPay.dataset.planId = planCard.dataset.plan;
  btnContinue.addEventListener('click', subscribeToPlan);
  label.innerText = `Continue purchasing ${planName.toUpperCase()} plan`;
}
modalPay?.addEventListener('hide.bs.modal', (e) => {
  btnContinue.removeEventListener('click', subscribeToPlan);
});
async function subscribeToPlan(e) {
  try {
    const { planId } = e.target.closest('#modal-pay').dataset;
    showProgress(btnContinue);
    // get session from the server
    const { session } = await generateResult({
      url: `/api/v1/plans/checkout-session/${planId}`,
    });
    // Create a checkout form plus charge users
    await stripe.redirectToCheckout({ sessionId: session.id });
  } catch (err) {
    showError(err, btnContinue, 'Try Again!');
  }
}
