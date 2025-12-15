"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";
import { HiLocationMarker, HiPlus, HiPencil, HiTrash } from "react-icons/hi";
import toast from "react-hot-toast";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    address_line: "",
    city: "",
    region: "",
    is_default: false,
  });

  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  });

  useEffect(() => {
    if (accessToken) {
      fetchAddresses();
    }
  }, [accessToken]);

  async function fetchAddresses() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/addresses/", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(address) {
    setEditingId(address.id);
    setFormData({
      full_name: address.full_name,
      phone_number: address.phone_number,
      address_line: address.address_line,
      city: address.city,
      region: address.region,
      is_default: address.is_default,
    });
    setShowForm(true);
  }

  function handleDelete(id) {
    if (confirm("Are you sure you want to delete this address?")) {
      deleteAddress(id);
    }
  }

  async function deleteAddress(id) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/addresses/${id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        setAddresses(addresses.filter((addr) => addr.id !== id));
        toast.success("Address deleted");
      } else {
        toast.error("Failed to delete address");
      }
    } catch (error) {
      toast.error("Error deleting address");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const url = editingId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/addresses/${editingId}/`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/addresses/";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        if (editingId) {
          setAddresses(
            addresses.map((addr) => (addr.id === editingId ? data : addr))
          );
          toast.success("Address updated");
        } else {
          setAddresses([...addresses, data]);
          toast.success("Address added");
        }
        resetForm();
      } else {
        toast.error("Failed to save address");
      }
    } catch (error) {
      toast.error("Error saving address");
    }
  }

  function resetForm() {
    setFormData({
      full_name: "",
      phone_number: "",
      address_line: "",
      city: "",
      region: "",
      is_default: false,
    });
    setShowForm(false);
    setEditingId(null);
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <p>Loading...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen px-5 lg:px-40 pb-20">
        <Breadcrumbs
          items={[
            { label: "Addresses", href: "/addresses" },
          ]}
        />
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Addresses</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-[#FF6B9D] text-white px-4 py-2 rounded-md hover:bg-[#FF5A8A]"
          >
            <HiPlus size={20} />
            Add Address
          </button>
        </div>

        {showForm && (
          <div className="border border-gray-200 rounded-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? "Edit Address" : "Add New Address"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                required
                className="w-full border border-gray-300 rounded-md p-2"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData({ ...formData, phone_number: e.target.value })
                }
                required
                className="w-full border border-gray-300 rounded-md p-2"
              />
              <input
                type="text"
                placeholder="Address Line"
                value={formData.address_line}
                onChange={(e) =>
                  setFormData({ ...formData, address_line: e.target.value })
                }
                required
                className="w-full border border-gray-300 rounded-md p-2"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  required
                  className="w-full border border-gray-300 rounded-md p-2"
                />
                <input
                  type="text"
                  placeholder="Region"
                  value={formData.region}
                  onChange={(e) =>
                    setFormData({ ...formData, region: e.target.value })
                  }
                  required
                  className="w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) =>
                    setFormData({ ...formData, is_default: e.target.checked })
                  }
                />
                <span>Set as default address</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-[#FF6B9D] text-white px-6 py-2 rounded-md hover:bg-[#FF5A8A]"
                >
                  {editingId ? "Update" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="border border-gray-300 px-6 py-2 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="border border-gray-200 rounded-md p-6 relative"
            >
              <div className="flex items-start gap-2 mb-4">
                <HiLocationMarker size={20} className="text-[#FF6B9D]" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{address.full_name}</p>
                      {address.is_default && (
                        <span className="text-xs bg-[#FF6B9D]/10 text-[#FF6B9D] px-2 py-1 rounded mt-1 inline-block">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(address)}
                        className="text-gray-600 hover:text-[#FF6B9D]"
                      >
                        <HiPencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(address.id)}
                        className="text-gray-600 hover:text-[#FF6B9D]"
                      >
                        <HiTrash size={18} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {address.address_line}
                  </p>
                  <p className="text-sm text-gray-600">
                    {address.city}, {address.region}
                  </p>
                  <p className="text-sm text-gray-600">{address.phone_number}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {addresses.length === 0 && !showForm && (
          <div className="text-center py-12">
            <HiLocationMarker size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-gray-600 mb-4">No addresses saved</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-[#FF6B9D] hover:underline font-semibold"
            >
              Add your first address
            </button>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

