import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { initializeSocket, disconnectSocket } from '../services/socket'; // Add disconnectSocket

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check if user is logged in on app start
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const userToken = await AsyncStorage.getItem('userToken');
            const userData = await AsyncStorage.getItem('userData');

            if (userToken && userData) {
                const parsedUserData = JSON.parse(userData);
                setUser(parsedUserData);

                // Initialize socket when app starts with existing user
                initializeSocket(userToken, parsedUserData._id);
            }
        } catch (error) {
            console.log('Auth check error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });

            if (response.data.token) {
                const userData = {
                    _id: response.data._id,
                    username: response.data.username,
                    email: response.data.email,
                };

                // Store user data and token
                await AsyncStorage.setItem('userToken', response.data.token);
                await AsyncStorage.setItem('userData', JSON.stringify(userData));

                setUser(userData);

                // CRITICAL: Initialize socket AFTER successful login
                initializeSocket(response.data.token, userData._id);

                return { success: true, data: userData };
            }
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Login failed'
            };
        }
    };

    // Do the same for register function
    const register = async (username, email, password) => {
        try {
            const response = await api.post('/auth/register', {
                username,
                email,
                password
            });

            if (response.data.token) {
                const userData = {
                    _id: response.data._id,
                    username: response.data.username,
                    email: response.data.email,
                };

                await AsyncStorage.setItem('userToken', response.data.token);
                await AsyncStorage.setItem('userData', JSON.stringify(userData));

                setUser(userData);

                // ✅ CRITICAL: Initialize socket AFTER successful registration
                initializeSocket(response.data.token, userData._id);

                return { success: true, data: userData };
            }
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Registration failed'
            };
        }
    };

    const logout = async () => {
        try {
            // Disconnect socket first
            disconnectSocket();

            // Then clear storage and state
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
            setUser(null);
        } catch (error) {
            console.log('Logout error:', error);
        }
    };

    const value = {
        user,
        isLoading,
        login,
        register,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};