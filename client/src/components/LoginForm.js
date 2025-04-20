import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiEye, FiEyeOff, FiLogIn } from 'react-icons/fi';
import { toast } from 'react-toastify';
import styled from 'styled-components';
import { FaUser, FaLock, FaSignInAlt } from 'react-icons/fa';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const { login, loading, error, isAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuth) {
      navigate('/chats');
    }
  }, [isAuth, navigate]);

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
    
    if (!password) {
      newErrors.password = 'Пароль обязателен';
    } else if (password.length < 6) {
      newErrors.password = 'Пароль должен содержать минимум 6 символов';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const success = await login(username, password);
      
      if (success) {
        navigate('/chats');
      }
    } catch (error) {
      // Error is already handled in AuthContext
      console.error('Login submission error:', error);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <FormContainer>
      <FormHeader>
        <Title>Вход в систему</Title>
        <Subtitle>Добро пожаловать! Пожалуйста, войдите в свой аккаунт.</Subtitle>
      </FormHeader>
      
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="username">Имя пользователя</Label>
          <InputWrapper>
            <Icon><FaUser /></Icon>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите имя пользователя"
              $error={errors.username}
            />
          </InputWrapper>
          {errors.username && <ErrorMessage>{errors.username}</ErrorMessage>}
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="password">Пароль</Label>
          <InputWrapper>
            <Icon><FaLock /></Icon>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              $error={errors.password}
            />
            <PasswordToggle 
              type="button" 
              onClick={toggleShowPassword}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </PasswordToggle>
          </InputWrapper>
          {errors.password && <ErrorMessage>{errors.password}</ErrorMessage>}
        </FormGroup>
        
        <RememberForgotRow>
          <RememberMeWrapper>
            <Checkbox
              type="checkbox"
              id="remember"
            />
            <RememberLabel htmlFor="remember">Запомнить меня</RememberLabel>
          </RememberMeWrapper>
          <ForgotPassword to="/forgot-password">Забыли пароль?</ForgotPassword>
        </RememberForgotRow>
        
        <SubmitButton type="submit" disabled={loading}>
          {loading ? (
            <>
              <Spinner />
              <span>Вход...</span>
            </>
          ) : (
            <>
              <FaSignInAlt />
              <span>Войти</span>
            </>
          )}
        </SubmitButton>
      </Form>
      
      <Divider>
        <DividerLine />
        <DividerText>Или</DividerText>
        <DividerLine />
      </Divider>
      
      <RegisterPrompt>
        Еще нет аккаунта? <RegisterLink to="/register">Зарегистрироваться</RegisterLink>
      </RegisterPrompt>
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

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Icon = styled.div`
  position: absolute;
  left: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 1rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid ${props => props.$error ? '#e74c3c' : '#dcdde1'};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  font-size: 1rem;
  outline: none;
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

const RememberForgotRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
`;

const RememberMeWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Checkbox = styled.input`
  width: 1rem;
  height: 1rem;
  accent-color: ${({ theme }) => theme.colors.primary};
`;

const RememberLabel = styled.label`
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
`;

const ForgotPassword = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  
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

const RegisterPrompt = styled.div`
  text-align: center;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const RegisterLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export default LoginForm; 