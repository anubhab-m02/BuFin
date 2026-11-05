import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, UNAUTHORIZED_EVENT } from '../lib/api';

const AuthContext = createContext();

// A context module exports its hook next to its provider by design.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    // Any API call that answers 401 (expired or revoked token) ends the session. Registered
    // before the init effect below so a 401 from the very first request is not missed.
    useEffect(() => {
        const onUnauthorized = () => {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
        };
        window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    }, []);

    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                try {
                    const userData = await api.getMe(token);
                    setUser(userData);
                    setIsAuthenticated(true);
                } catch (error) {
                    // A 401 already logged the user out through the event above. Anything else
                    // (backend down, a 500, a network blip) must not throw away a valid token:
                    // the user stays signed out of this page load and a reload retries.
                    console.error("Auth initialization failed", error);
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
