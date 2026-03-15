import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getClientDetails } from '@/api/clients';

const EditClient = () => {
  const { clientId } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    getClientDetails(clientId)
      .then((data) => {
        setClient(data);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load client');
        setLoading(false);
      });
  }, [clientId]);

  if (loading) {
    return <div>Loading client...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!client) {
    return <div>No client found.</div>;
  }

  return (
    <div>
      <h1>Edit Client</h1>
      <form className="space-y-4 max-w-lg mt-6">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            className="border rounded px-3 py-2 w-full"
            type="text"
            value={client.fullName || ''}
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            className="border rounded px-3 py-2 w-full"
            type="email"
            value={client.email || ''}
            readOnly
          />
        </div>
        {/* Add more fields as needed */}
      </form>
    </div>
  );
};

export default EditClient;
