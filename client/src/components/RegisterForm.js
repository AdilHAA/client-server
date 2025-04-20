import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiUserPlus } from 'react-icons/fi';
import { toast } from 'react-toastify';
import styled from 'styled-components';

const RegisterForm = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const { register, loading, error, isAuth } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuth) {
      navigate('/chats');
    }
  }, [isAuth, navigate]);

  // Handle API errors
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!username.trim()) {
      newErrors.username = 'Имя пользователя обязательно';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email обязателен';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = 'Введите корректный email';
      }
    }
    
    if (!password) {
      newErrors.password = 'Пароль обязателен';
    } else if (password.length < 6) {
      newErrors.password = 'Пароль должен быть не менее 6 символов';
    }
    
    if (!passwordConfirm) {
      newErrors.passwordConfirm = 'Подтверждение пароля обязательно';
    } else if (password !== passwordConfirm) {
      newErrors.passwordConfirm = 'Пароли не совпадают';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const success = await register(username, email, password);
    if (success) {
      toast.success('Регистрация выполнена успешно! Теперь вы можете войти в систему.');
      navigate('/login');
    }
  };

  return (
    <FormContainer>
      <FormHeader>
        <Title>Регистрация</Title>
        <Subtitle>Создайте новый аккаунт для доступа к приложению</Subtitle>
      </FormHeader>
      
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="username">Имя пользователя</Label>
          <InputWrapper>
            <InputIcon>
              <FiUser />
            </InputIcon>
            <Input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Имя пользователя"
              error={errors.username}
            />
          </InputWrapper>
          {errors.username && <ErrorMessage>{errors.username}</ErrorMessage>}
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="email">Email</Label>
          <InputWrapper>
            <InputIcon>
              <FiMail />
            </InputIcon>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              error={errors.email}
            />
          </InputWrapper>
          {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="password">Пароль</Label>
          <InputWrapper>
            <InputIcon>
              <FiLock />
            </InputIcon>
            <Input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              error={errors.password}
            />
            <PasswordToggle 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </PasswordToggle>
          </InputWrapper>
          {errors.password && <ErrorMessage>{errors.password}</ErrorMessage>}
          <PasswordHint>Минимум 6 символов</PasswordHint>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="passwordConfirm">Подтверждение пароля</Label>
          <InputWrapper>
            <InputIcon>
              <FiLock />
            </InputIcon>
            <Input
              type={showPasswordConfirm ? "text" : "password"}
              id="passwordConfirm"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Подтверждение пароля"
              error={errors.passwordConfirm}
            />
            <PasswordToggle 
              type="button" 
              onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
            >
              {showPasswordConfirm ? <FiEyeOff /> : <FiEye />}
            </PasswordToggle>
          </InputWrapper>
          {errors.passwordConfirm && <ErrorMessage>{errors.passwordConfirm}</ErrorMessage>}
        </FormGroup>
        
        <TermsAgreement>
          <Checkbox
            type="checkbox"
            id="terms"
            required
          />
          <TermsLabel htmlFor="terms">
            Я согласен с <TermsLink to="/terms">условиями использования</TermsLink>
          </TermsLabel>
        </TermsAgreement>
        
        <SubmitButton type="submit" disabled={loading}>
          {loading ? (
            <>
              <Spinner />
              <span>Регистрация...</span>
            </>
          ) : (
            <>
              <FiUserPlus />
              <span>Зарегистрироваться</span>
            </>
          )}
        </SubmitButton>
      </Form>
      
      <Divider>
        <DividerLine />
        <DividerText>Или</DividerText>
        <DividerLine />
      </Divider>
      
      <LoginPrompt>
        Уже есть аккаунт? <LoginLink to="/login">Войти</LoginLink>
      </LoginPrompt>
    </FormContainer>
  );
};

const FormContainer = styled.div`
  max-width: 400px;
  width: 100%;
  padding: 2rem;
  background-color: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.border.radius.md};
  box-shadow: ${({ theme }) => theme.shadows.medium};
`;

const FormHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.875rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputIcon = styled.div`
  position: absolute;
  left: 1rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid ${props => props.error ? '#e74c3c' : '${({ theme }) => theme.colors.border}'};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  font-size: 1rem;
  transition: all ${({ theme }) => theme.transitions.fast};
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(44, 123, 229, 0.1);
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

const ErrorMessage = styled.p`
  color: #e74c3c;
  font-size: 0.85rem;
  margin-top: 0.3rem;
  margin-left: 0.2rem;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 1rem;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  
  &:hover {
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

const PasswordHint = styled.small`
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const TermsAgreement = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
`;

const Checkbox = styled.input`
  width: 1rem;
  height: 1rem;
  margin-top: 0.25rem;
  accent-color: ${({ theme }) => theme.colors.primary};
`;

const TermsLabel = styled.label`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.875rem;
  line-height: 1.5;
`;

const TermsLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`;

const SubmitButton = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.border.radius.sm};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.transitions.fast};
  margin-top: 0.5rem;

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.secondary};
    cursor: not-allowed;
  }
`;

const Spinner = styled.div`
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 1.5rem 0;
`;

const DividerLine = styled.div`
  flex: 1;
  height: 1px;
  background-color: ${({ theme }) => theme.colors.border};
`;

const DividerText = styled.span`
  padding: 0 1rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.875rem;
`;

const LoginPrompt = styled.div`
  text-align: center;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const LoginLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`;

export default RegisterForm; 