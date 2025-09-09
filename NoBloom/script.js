// Simulated user database (in real app, this would be in a database)
        const userDatabase = [
            { id: 1, username: 'admin', password: 'admin123', email: 'admin@example.com' },
            { id: 2, username: 'user1', password: 'pass123', email: 'user1@example.com' },
            { id: 3, username: 'john.doe', password: 'secret', email: 'john@example.com' },
            { id: 4, username: 'jane.smith', password: 'password', email: 'jane@example.com' },
            { id: 5, username: 'bob.wilson', password: 'bobby123', email: 'bob@example.com' },
            // Adding more users to simulate a larger database
            ...Array.from({ length: 10000 }, (_, i) => ({
                id: i + 6,
                username: `user${i + 6}`,
                password: `pass${i + 6}`,
                email: `user${i + 6}@example.com`
            }))
        ];

        let totalQueries = 0;
        let totalRecordsScanned = 0;

        // Simulate database lookup WITHOUT Bloom filter
        function authenticateUser(username, password) {
            const startTime = performance.now();
            
            // Reset counters for this request
            let queriesThisRequest = 0;
            let recordsScannedThisRequest = 0;

            // WITHOUT Bloom Filter: We must scan through the entire database
            // In real applications, this would be multiple database queries
            
            // First query: Check if username exists
            queriesThisRequest++;
            let userFound = null;
            
            // Simulate the expensive operation of scanning records
            for (let i = 0; i < userDatabase.length; i++) {
                recordsScannedThisRequest++;
                
                // Simulate database I/O delay
                const now = performance.now();
                while (performance.now() - now < 0.001) {} // 1 microsecond delay per record
                
                if (userDatabase[i].username === username) {
                    userFound = userDatabase[i];
                    break; // Found user, stop scanning
                }
            }

            // Second query: If user exists, verify password
            if (userFound) {
                queriesThisRequest++;
                recordsScannedThisRequest++; // One more record to verify password
                
                if (userFound.password === password) {
                    const endTime = performance.now();
                    const lookupTime = endTime - startTime;
                    
                    // Update metrics
                    totalQueries += queriesThisRequest;
                    totalRecordsScanned += recordsScannedThisRequest;
                    
                    updateMetrics(queriesThisRequest, recordsScannedThisRequest, lookupTime, lookupTime);
                    
                    return {
                        success: true,
                        user: { username: userFound.username, email: userFound.email },
                        message: 'Login successful!'
                    };
                }
            }

            const endTime = performance.now();
            const lookupTime = endTime - startTime;
            
            // Update metrics even for failed attempts
            totalQueries += queriesThisRequest;
            totalRecordsScanned += recordsScannedThisRequest;
            
            updateMetrics(queriesThisRequest, recordsScannedThisRequest, lookupTime, lookupTime);
            
            return {
                success: false,
                message: 'Invalid username or password!'
            };
        }

        function updateMetrics(queries, records, lookupTime, totalTime) {
            document.getElementById('dbQueries').textContent = totalQueries;
            document.getElementById('recordsScanned').textContent = totalRecordsScanned;
            document.getElementById('lookupTime').textContent = `${lookupTime.toFixed(2)}ms`;
            document.getElementById('totalTime').textContent = `${totalTime.toFixed(2)}ms`;
        }

        function showMessage(message, isSuccess) {
            const statusDiv = document.getElementById('statusMessage');
            statusDiv.textContent = message;
            statusDiv.className = 'status-message ' + (isSuccess ? 'success' : 'error');
        }

        // Handle form submission
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const loginBtn = document.getElementById('loginBtn');
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            if (!username || !password) {
                showMessage('Please enter both username and password.', false);
                return;
            }

            // Disable button and show loading state
            loginBtn.disabled = true;
            loginBtn.textContent = 'Authenticating...';

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 100));

            try {
                const result = authenticateUser(username, password);
                
                if (result.success) {
                    showMessage(`Welcome, ${result.user.username}!`, true);
                    // In a real app, you would redirect or update the UI
                    console.log('User authenticated:', result.user);
                } else {
                    showMessage(result.message, false);
                }
            } catch (error) {
                showMessage('An error occurred during authentication.', false);
                console.error('Authentication error:', error);
            }

            // Re-enable button
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        });

        // Initialize display
        updateMetrics(0, 0, 0, 0);