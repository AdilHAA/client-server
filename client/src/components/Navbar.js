import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiMenu, FiX, FiLogOut, FiMessageSquare, FiHome } from 'react-icons/fi';
import { toast } from 'react-toastify';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Вы успешно вышли из системы');
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <NavContainer>
      <NavContent>
        <NavBrand to="/">
          <BrandIcon>🤖</BrandIcon>
          <BrandName>AI Assistant</BrandName>
        </NavBrand>
        
        <MobileMenuToggle onClick={toggleMobileMenu}>
          {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </MobileMenuToggle>
        
        <NavLinks $mobileMenuOpen={mobileMenuOpen}>
          <NavLinkItem>
            <NavLink to="/">
              <FiHome />
              <LinkText>Главная</LinkText>
            </NavLink>
          </NavLinkItem>
          
          {user ? (
            <>
              <NavLinkItem>
                <NavLink to="/chats">
                  <FiMessageSquare />
                  <LinkText>Мои чаты</LinkText>
                </NavLink>
              </NavLinkItem>
              <NavLinkItem>
                <UserMenu>
                  <UserInfo>
                    <UserIcon><FiUser /></UserIcon>
                    <Username>{user.username}</Username>
                  </UserInfo>
                  <LogoutButton onClick={handleLogout}>
                    <FiLogOut />
                    <ButtonText>Выйти</ButtonText>
                  </LogoutButton>
                </UserMenu>
              </NavLinkItem>
            </>
          ) : (
            <>
              <NavLinkItem>
                <AuthLink to="/login">Войти</AuthLink>
              </NavLinkItem>
              <NavLinkItem>
                <SignUpButton to="/register">Регистрация</SignUpButton>
              </NavLinkItem>
            </>
          )}
        </NavLinks>
      </NavContent>
    </NavContainer>
  );
};

const NavContainer = styled.nav`
  background-color: ${({ theme }) => theme.colors.white};
  box-shadow: ${({ theme }) => theme.shadows.small};
  position: sticky;
  top: 0;
  z-index: ${({ theme }) => theme.zIndex.high};
`;

const NavContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const NavBrand = styled(Link)`
  display: flex;
  align-items: center;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const BrandIcon = styled.span`
  font-size: 1.75rem;
  margin-right: 0.5rem;
`;

const BrandName = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: none;
  }
`;

const MobileMenuToggle = styled.button`
  display: none;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const NavLinks = styled.ul`
  display: flex;
  align-items: center;
  list-style: none;
  gap: 1.5rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    background-color: ${({ theme }) => theme.colors.white};
    box-shadow: ${({ theme }) => theme.shadows.medium};
    padding: 1rem;
    gap: 1rem;
    transform: ${({ $mobileMenuOpen }) => $mobileMenuOpen ? 'translateY(0)' : 'translateY(-100%)'};
    opacity: ${({ $mobileMenuOpen }) => $mobileMenuOpen ? 1 : 0};
    visibility: ${({ $mobileMenuOpen }) => $mobileMenuOpen ? 'visible' : 'hidden'};
    transition: all ${({ theme }) => theme.transitions.normal};
    z-index: ${({ theme }) => theme.zIndex.high};
  }
`;

const NavLinkItem = styled.li`
  display: flex;
  align-items: center;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    width: 100%;
  }
`;

const NavLink = styled(Link)`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 500;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: ${({ theme }) => theme.border.radius.sm};
  transition: all ${({ theme }) => theme.transitions.fast};
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background-color: ${({ theme }) => theme.colors.light};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    width: 100%;
    padding: 0.75rem;
  }
`;

const LinkText = styled.span`
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: none;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: inline;
  }
`;

const UserMenu = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const UserIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.border.radius.circle};
  background-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
`;

const Username = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.colors.danger};
  background: none;
  border: none;
  font-weight: 500;
  padding: 0.5rem 0.75rem;
  border-radius: ${({ theme }) => theme.border.radius.sm};
  transition: background-color ${({ theme }) => theme.transitions.fast};
  
  &:hover {
    background-color: rgba(230, 55, 87, 0.1);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    width: 100%;
  }
`;

const ButtonText = styled.span`
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: none;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: inline;
  }
`;

const AuthLink = styled(Link)`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 500;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.border.radius.sm};
  transition: all ${({ theme }) => theme.transitions.fast};
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background-color: ${({ theme }) => theme.colors.light};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    width: 100%;
    text-align: center;
  }
`;

const SignUpButton = styled(Link)`
  display: inline-block;
  background-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.border.radius.sm};
  transition: background-color ${({ theme }) => theme.transitions.fast};
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
    color: ${({ theme }) => theme.colors.white};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    width: 100%;
    text-align: center;
  }
`;

export default Navbar; 