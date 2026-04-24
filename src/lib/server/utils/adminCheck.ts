export const isAdmin = (user: App.User): boolean => {
    return user.role === 'admin';
};

export const requireAdmin = (user: App.User): void => {
    if (!isAdmin(user)) {
        throw new Error('Forbidden: admin access required');
    }
};
