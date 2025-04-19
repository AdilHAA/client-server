import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const RegisterForm = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [validationError, setValidationError] = useState('');
  const { register, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Валидация пароля
    if (password !== passwordConfirm) {
      setValidationError('Пароли не совпадают');
      return;
    }
    
    if (password.length < 6) {
      setValidationError('Пароль должен быть не менее 6 символов');
      return;
    }
    
    setValidationError('');
    const success = await register(username, email, password);
    if (success) {
      navigate('/login');
    }
  };

  return (
    <FormContainer>
      <h2>Регистрация</h2>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {validationError && <ErrorMessage>{validationError}</ErrorMessage>}
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="username">Имя пользователя</Label>
          <Input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="password">Пароль</Label>
          <Input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="passwordConfirm">Подтверждение пароля</Label>
          <Input
            type="password"
            id="passwordConfirm"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
          />
        </FormGroup>
        <Button type="submit" disabled={loading}>
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </Button>
      </Form>
      <LinkText>
        Уже зарегистрированы? <Link to="/login">Войти</Link>
      </LinkText>
    </FormContainer>
  );
};

const FormContainer = styled.div`
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: var(--box-shadow);
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: var(--dark-color);
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
  transition: border 0.2s;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }
`;

const Button = styled.button`
  padding: 0.75rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 1rem;

  &:hover {
    background-color: var(--primary-dark);
  }

  &:disabled {
    background-color: var(--secondary-color);
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: var(--danger-color);
  background-color: rgba(230, 55, 87, 0.1);
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
`;

const LinkText = styled.p`
  margin-top: 1.5rem;
  text-align: center;
  color: var(--secondary-color);

  a {
    color: var(--primary-color);
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

export default RegisterForm; 