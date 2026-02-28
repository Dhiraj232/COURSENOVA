"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import axios from "axios";
import { endpoints } from "@/lib/api";

export default function OnboardingPage() {
    const { data: session, update } = useSession();
    const router = useRouter();

    const [collegeName, setCollegeName] = useState("");
    const [city, setCity] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!collegeName || !city) return;

        setLoading(true);
        try {
            // Mock geocoding - In a real app we would use Google Maps API or similar
            // For now we just send the city and let backend handle or mock
            const coords = [77.2090, 28.6139]; // Default dummy coordinates (Delhi)

            const res = await axios.put(
                endpoints.users.onboarding,
                { collegeName, city, coordinates: coords },
                { headers: { Authorization: `Bearer ${session?.accessToken}` } }
            );

            if (res.data.success) {
                // Update session to reflect onboarded status
                await update({ isOnboarded: true });
                router.push("/browse");
            }
        } catch (error) {
            console.error("Onboarding failed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-xl">
                <div className="text-center">
                    <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900">
                        Welcome to RENVOX!
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        We just need a few more details to help you find books nearby.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="college" className="block text-sm font-medium text-gray-700">
                                College or University Name
                            </label>
                            <input
                                id="college"
                                type="text"
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm text-gray-900"
                                placeholder="e.g. Delhi University"
                                value={collegeName}
                                onChange={(e) => setCollegeName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                                City / Area
                            </label>
                            <input
                                id="city"
                                type="text"
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm text-gray-900"
                                placeholder="e.g. New Delhi"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                        >
                            {loading ? "Saving..." : "Start Browsing Books"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
