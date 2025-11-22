import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                try {
                    // Set token in API headers (we'll update api.js to handle this)
                    // For now, we assume api.js will be updated to use this token
                    const userData = await api.getMe(token);
                    setUser(userData);
                    setIsAuthenticated(true);
                } catch (error) {
                    console.error("Auth initialization failed", error);
                    logout();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, [token]);

    const login = async (email, password) => {
        try {
            const data = await api.login(email, password);
            localStorage.setItem('token', data.access_token);
            setToken(data.access_token);
            setIsAuthenticated(true);
            return true;
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const signup = async (email, password, fullName) => {
        try {
            const data = await api.signup(email, password, fullName);
            localStorage.setItem('token', data.access_token);
            setToken(data.access_token);
            setIsAuthenticated(true);
            return true;
        } catch (error) {
            console.error("Signup failed", error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
    };

    const refreshUser = async () => {
        if (token) {
            try {
                const userData = await api.getMe(token);
                setUser(userData);
            } catch (error) {
                console.error("Failed to refresh user", error);
            }
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, login, signup, logout, loading, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};
