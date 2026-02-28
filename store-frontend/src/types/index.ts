export interface User {
    _id: string;
    name: string;
    email: string;
    collegeName?: string;
    city?: string;
    profilePicture?: string;
}

export interface Book {
    _id: string;
    title: string;
    subject: string;
    condition: "New" | "Good" | "Old";
    price: number;
    images: string[];
    collegeName: string;
    seller: User;
    status: "available" | "sold" | "reported";
    createdAt: string;
}
