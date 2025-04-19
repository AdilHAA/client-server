import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      navigate('/chats');
    }
  };

  return (
    <FormContainer>
      <h2>Вход в систему</h2>
      {error && <ErrorMessage>{error}</ErrorMessage>}
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
          <Label htmlFor="password">Пароль</Label>
          <Input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormGroup>
        <Button type="submit" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </Button>
      </Form>
      <LinkText>
        Еще не зарегистрированы? <Link to="/register">Создать аккаунт</Link>
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

export default LoginForm; 