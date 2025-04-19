import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <NavContainer>
      <NavBrand to="/">
        <BrandIcon>🤖</BrandIcon>
        <BrandName>AI Assistant</BrandName>
      </NavBrand>
      
      <NavLinks>
        {user ? (
          <>
            <NavLink to="/chats">Мои чаты</NavLink>
            <UserMenu>
              <UserInfo>
                <Username>{user.username}</Username>
              </UserInfo>
              <LogoutButton onClick={handleLogout}>
                Выйти
              </LogoutButton>
            </UserMenu>
          </>
        ) : (
          <>
            <NavLink to="/login">Войти</NavLink>
            <NavLink to="/register">Регистрация</NavLink>
          </>
        )}
      </NavLinks>
    </NavContainer>
  );
};

const NavContainer = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const NavBrand = styled(Link)`
  display: flex;
  align-items: center;
  text-decoration: none;
  color: var(--dark-color);
`;

const BrandIcon = styled.span`
  font-size: 1.75rem;
  margin-right: 0.5rem;
`;

const BrandName = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

const NavLink = styled(Link)`
  color: var(--secondary-color);
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s;
  
  &:hover {
    color: var(--primary-color);
  }
`;

const UserMenu = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const Username = styled.span`
  font-weight: 500;
  color: var(--dark-color);
`;

const LogoutButton = styled.button`
  color: var(--danger-color);
  background: none;
  border: none;
  font-weight: 500;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  transition: background-color 0.2s;
  border-radius: 4px;
  
  &:hover {
    background-color: rgba(230, 55, 87, 0.1);
  }
`;

export default Navbar; 