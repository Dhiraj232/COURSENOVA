"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { endpoints } from "@/lib/api";
import StoreNavbar from "@/components/StoreNavbar";
import { UploadCloud, Image as ImageIcon, X } from "lucide-react";

export default function SellPage() {
    const router = useRouter();
    const [token, setToken] = useState<string | null>(null);
    const [userData, setUserData] = useState<any>(null);

    // Load token and user data on mount
    React.useEffect(() => {
        const storedToken = localStorage.getItem("token");
        if (!storedToken) {
            router.push("/login");
        } else {
            setToken(storedToken);
            // Fetch user data
            axios
                .get(endpoints.auth.me, {
                    headers: { Authorization: `Bearer ${storedToken}` }
                })
                .then((res) => setUserData(res.data.user))
                .catch(() => router.push("/login"));
        }
    }, [router]);

    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        subject: "",
        condition: "Used",
        price: "",
        img: "", // base64 or URL
        contact: ""
    });
    const [message, setMessage] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                setFormData({ ...formData, img: base64 });
                setPreview(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            alert("You must be logged in");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const payload = {
                name: formData.name,
                subject: formData.subject || "General",
                college: userData?.college || "Local",
                condition: formData.condition,
                price: Number(formData.price),
                img: formData.img || "",
                contact: formData.contact || userData?.mobile || "",
            };

            const res = await axios.post(endpoints.books.create, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.ok) {
                setMessage("✅ Book posted successfully!");
                setTimeout(() => router.push("/browse"), 1500);
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || "Failed to post listing";
            setMessage(`❌ ${errorMsg}`);
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!session) return <div className="min-h-screen bg-gray-50 animate-pulse"></div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <StoreNavbar />

            <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12">
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                    <div className="bg-blue-600 px-8 py-6 text-white">
                        <h1 className="text-2xl font-bold">Sell a Book</h1>
                        <p className="mt-1 text-blue-100">Post your study materials for students in your college to buy.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6 flex flex-col">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Book Title / Notes Subject</label>
                            <input
                                required
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-gray-900"
                                placeholder="e.g., Data Structures using C++"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Subject Category */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Subject Area</label>
                                <select
                                    required
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                >
                                    <option value="" disabled>Select Subject</option>
                                    <option value="Computer Science">Computer Science</option>
                                    <option value="Mechanical">Mechanical</option>
                                    <option value="Commerce">Commerce</option>
                                    <option value="Medical">Medical</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {/* Condition */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Condition</label>
                                <select
                                    required
                                    name="condition"
                                    value={formData.condition}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                >
                                    <option value="New">Like New (Barely used)</option>
                                    <option value="Good">Good (Some highlights/wear)</option>
                                    <option value="Old">Old (Heavy wear but readable)</option>
                                </select>
                            </div>
                        </div>

                        {/* Price */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Selling Price (₹)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="text-gray-500 font-bold">₹</span>
                                </div>
                                <input
                                    required
                                    type="number"
                                    name="price"
                                    min="0"
                                    value={formData.price}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-gray-300 pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-gray-900"
                                    placeholder="250"
                                />
                            </div>
                        </div>

                        {/* Image Link (Simplified for V1) */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Book Image URL (Optional for now)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <ImageIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="url"
                                    name="imageLink"
                                    value={formData.imageLink}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-gray-300 pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                    placeholder="Paste an image URL (e.g., Imgur link) or leave empty"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Image uploads via drag & drop will be added in v2.</p>
                        </div>

                        {/* Info Box */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                            <p className="text-sm text-gray-800">
                                <strong>✓ Your Location:</strong> {userData?.college || "Your area"}<br />
                                <strong>✓ Visibility:</strong> Students nearby can search and find your books<br />
                                <strong>✓ Safe:</strong> Direct contact only - no commission fees
                            </p>
                        </div>

                        {/* Submit Buttons */}
                        <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                type="button"
                                className="px-6 py-3 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 transition"
                                onClick={() => router.back()}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-white shadow-lg hover:shadow-xl disabled:opacity-70 transition flex items-center"
                            >
                                {loading ? "Publishing..." : (
                                    <>
                                        <UploadCloud className="mr-2 h-5 w-5" />
                                        Publish Now
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
