export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const endpoints = {
    auth: {
        signup: `${BASE_URL}/signup`,
        login: `${BASE_URL}/login`,
        verifyOtp: `${BASE_URL}/verify-otp`,
        me: `${BASE_URL}/me`,
    },
    users: {
        profile: `${BASE_URL}/update-profile`,
    },
    books: {
        base: `${BASE_URL}/books`,
        list: `${BASE_URL}/books`,
        create: `${BASE_URL}/books`,
        delete: (id: string) => `${BASE_URL}/books/${id}`,
    },
    messages: {
        base: `${BASE_URL}/messages`,
    }
};
