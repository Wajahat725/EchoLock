import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import { registerUser } from '../../services/authService';
import { ROUTES } from '../../utils/constants';
import { parseSecretChars, validateUsername } from '../../utils/validators';

const RegisterForm = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [secretChars, setSecretChars] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    const usernameError = validateUsername(username);
    const { chars, error: secretError } = parseSecretChars(secretChars);
    setErrors({ username: usernameError, secretChars: secretError });
    if (usernameError || secretError) return;

    setLoading(true);
    try {
      await registerUser({ username, secretChars: chars.join(',') });
      toast.success('Account created! You can sign in now.');
      navigate(ROUTES.LOGIN);
    } catch (err) {
      const msg = err.message || 'Registration failed';
      setApiError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {apiError && <Alert variant="error">{apiError}</Alert>}
      <Input
        label="Username"
        name="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Choose a username"
        error={errors.username}
      />
      <Input
        label="Secret characters"
        name="secretChars"
        value={secretChars}
        onChange={(e) => setSecretChars(e.target.value)}
        placeholder="A, B, C"
        error={errors.secretChars}
      />
      <p className="-mt-2 text-xs text-slate-500 leading-relaxed">
        Register 3 secret characters. At login you will click their positions on a dynamic grid.
      </p>
      <Button type="submit" className="w-full" loading={loading}>
        Create account
      </Button>
    </form>
  );
};

export default RegisterForm;

