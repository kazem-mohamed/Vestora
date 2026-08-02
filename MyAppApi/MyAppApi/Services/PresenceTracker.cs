namespace MyAppApi.Services
{
    /// <summary>
    /// In-memory online tracker for the chat hub. A user is "online" while they
    /// hold at least one live SignalR connection (multiple tabs count once).
    /// Online state is ephemeral by nature and resets on restart; the durable
    /// "last seen" timestamp is persisted to the database by ChatHub instead.
    /// Registered as a singleton.
    /// </summary>
    public class PresenceTracker
    {
        private readonly Dictionary<int, int> _connections = new(); // userId -> live connection count
        private readonly object _lock = new();

        /// <summary>Registers a connection. Returns true if the user just came online (0 -> 1).</summary>
        public bool Connect(int userId)
        {
            lock (_lock)
            {
                if (_connections.TryGetValue(userId, out var count))
                {
                    _connections[userId] = count + 1;
                    return false;
                }
                _connections[userId] = 1;
                return true;
            }
        }

        /// <summary>Removes a connection. Returns true if the user just went offline (1 -> 0).</summary>
        public bool Disconnect(int userId)
        {
            lock (_lock)
            {
                if (!_connections.TryGetValue(userId, out var count))
                {
                    return false;
                }
                if (count <= 1)
                {
                    _connections.Remove(userId);
                    return true;
                }
                _connections[userId] = count - 1;
                return false;
            }
        }

        public bool IsOnline(int userId)
        {
            lock (_lock)
            {
                return _connections.ContainsKey(userId);
            }
        }
    }
}
