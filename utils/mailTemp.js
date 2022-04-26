exports.mailTemp = async (name) => {
  const html = `
        <div
          class="container"
          style="max-width: 90%; margin: auto; padding-top: 20px"
        >
          <h2>Welcome ${name} .</h2>
          <h4>You are officially In ✔</h4>
          <p style="margin-bottom: 30px;">Pleas enter the sign up OTP to get started</p>
          <p style="margin-top:50px;">If you do not request for verification please do not respond to the mail. You can in turn un subscribe to the mailing list and we will never bother you again.</p>
        </div>
      `;
  return html;
};
