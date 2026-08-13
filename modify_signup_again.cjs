const fs = require('fs');

let signupContent = fs.readFileSync('src/components/SignupView.tsx', 'utf8');

if (!signupContent.includes('/api/organizations/provision')) {
  // We need to inject the fetch call.
  signupContent = signupContent.replace(
    /setTimeout\(\(\) => \{\n\s*setIsLoading\(false\);\n\s*onSignupSuccess\(\);\n\s*\}, 1000\);/s,
    `
    fetch('/api/organizations/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        organization: organization
      })
    })
    .then(res => res.json())
    .then(data => {
      setIsLoading(false);
      if (data.success) {
        onSignupSuccess();
      } else {
        alert(data.error || 'Provisioning failed');
      }
    })
    .catch(err => {
      setIsLoading(false);
      alert('Network error. Please try again.');
    });
    `
  );
  fs.writeFileSync('src/components/SignupView.tsx', signupContent);
}

console.log("SignupView updated with API call");
