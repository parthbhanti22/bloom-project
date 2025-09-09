// Simple Bloom Filter Implementation
        class BloomFilter {
            constructor(size, hashFunctions) {
                this.size = size;
                this.hashCount = hashFunctions;
                this.bitArray = new Array(size).fill(false);
                this.itemsAdded = 0;
            }

            // Simple hash function (not cryptographically secure, but good for demo)
            hash1(str) {
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    const char = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash; // Convert to 32-bit integer
                }
                return Math.abs(hash) % this.size;
            }

            hash2(str) {
                let hash = 5381;
                for (let i = 0; i < str.length; i++) {
                    hash = ((hash << 5) + hash) + str.charCodeAt(i);
                }
                return Math.abs(hash) % this.size;
            }

            // Generate multiple hash functions using the two base hash functions
            getHashes(str) {
                const hash1 = this.hash1(str);
                const hash2 = this.hash2(str);
                const hashes = [];
                
                for (let i = 0; i < this.hashCount; i++) {
                    hashes.push((hash1 + i * hash2) % this.size);
                }
                return hashes;
            }

            add(item) {
                const hashes = this.getHashes(item);
                for (const hash of hashes) {
                    this.bitArray[hash] = true;
                }
                this.itemsAdded++;
            }

            mightContain(item) {
                const hashes = this.getHashes(item);
                for (const hash of hashes) {
                    if (!this.bitArray[hash]) {
                        return false; // Definitely not in the set
                    }
                }
                return true; // Might be in the set
            }

            getFalsePositiveRate() {
                const ratio = this.itemsAdded / this.size;
                return Math.pow(1 - Math.exp(-this.hashCount * ratio), this.hashCount);
            }
        }

        // Simulated user database (same as the non-bloom version)
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

        // Initialize Bloom Filter
        const bloomFilter = new BloomFilter(50000, 3); // 50k bits, 3 hash functions

        // Add all usernames to the Bloom Filter
        userDatabase.forEach(user => {
            bloomFilter.add(user.username);
        });

        let totalBloomChecks = 0;
        let totalQueries = 0;
        let totalRecordsScanned = 0;

        // Update Bloom Filter info display
        function updateBloomInfo() {
            document.getElementById('filterSize').textContent = bloomFilter.size.toLocaleString();
            document.getElementById('hashFunctions').textContent = bloomFilter.hashCount;
            document.getElementById('falsePositiveRate').textContent = (bloomFilter.getFalsePositiveRate() * 100).toFixed(2);
            document.getElementById('usersInFilter').textContent = bloomFilter.itemsAdded.toLocaleString();
        }

        // Simulate database lookup WITH Bloom filter
        function authenticateUser(username, password) {
            const startTime = performance.now();
            
            // Reset counters for this request
            let queriesThisRequest = 0;
            let recordsScannedThisRequest = 0;
            let bloomChecksThisRequest = 0;

            // STEP 1: Check Bloom Filter first (this is FAST)
            const bloomStartTime = performance.now();
            bloomChecksThisRequest++;
            totalBloomChecks++;
            
            const mightExist = bloomFilter.mightContain(username);
            const bloomEndTime = performance.now();
            const bloomTime = bloomEndTime - bloomStartTime;

            // Show Bloom Filter result
            showBloomResult(username, mightExist, bloomTime);

            if (!mightExist) {
                // Bloom filter says "definitely not in database"
                // We can skip the expensive database lookup entirely!
                const totalTime = performance.now() - startTime;
                
                updateMetrics(bloomChecksThisRequest, queriesThisRequest, recordsScannedThisRequest, bloomTime, totalTime);
                
                return {
                    success: false,
                    message: 'Invalid username or password!',
                    bloomOptimized: true
                };
            }

            // STEP 2: Bloom filter says "might exist", so now we do the database lookup
            // But we can optimize this too - we can do targeted lookup instead of full scan
            queriesThisRequest++;
            let userFound = null;
            
            // In a real database, we'd use an index. Here, we simulate a more efficient lookup
            // since we "know" the username might exist
            for (let i = 0; i < userDatabase.length; i++) {
                recordsScannedThisRequest++;
                
                // Simulate database I/O delay (but less than without Bloom filter)
                const now = performance.now();
                while (performance.now() - now < 0.0005) {} // 0.5 microseconds delay per record
                
                if (userDatabase[i].username === username) {
                    userFound = userDatabase[i];
                    break;
                }
            }

            // Verify password if user exists
            if (userFound) {
                queriesThisRequest++;
                recordsScannedThisRequest++;
                
                if (userFound.password === password) {
                    const totalTime = performance.now() - startTime;
                    
                    totalQueries += queriesThisRequest;
                    totalRecordsScanned += recordsScannedThisRequest;
                    
                    updateMetrics(bloomChecksThisRequest, queriesThisRequest, recordsScannedThisRequest, bloomTime, totalTime);
                    
                    return {
                        success: true,
                        user: { username: userFound.username, email: userFound.email },
                        message: 'Login successful!'
                    };
                }
            }

            // Failed authentication
            const totalTime = performance.now() - startTime;
            
            totalQueries += queriesThisRequest;
            totalRecordsScanned += recordsScannedThisRequest;
            
            updateMetrics(bloomChecksThisRequest, queriesThisRequest, recordsScannedThisRequest, bloomTime, totalTime);
            
            return {
                success: false,
                message: 'Invalid username or password!'
            };
        }

        function showBloomResult(username, mightExist, bloomTime) {
            const bloomDiv = document.getElementById('bloomResult');
            if (mightExist) {
                bloomDiv.innerHTML = `🔍 <strong>Bloom Filter Result:</strong> Username "${username}" <strong>might exist</strong> (${bloomTime.toFixed(3)}ms) → Proceeding to database lookup`;
                bloomDiv.className = 'bloom-result';
            } else {
                bloomDiv.innerHTML = `⚡ <strong>Bloom Filter Result:</strong> Username "${username}" <strong>definitely doesn't exist</strong> (${bloomTime.toFixed(3)}ms) → Skipping database lookup!`;
                bloomDiv.className = 'bloom-result';
            }
        }

        function updateMetrics(bloomChecks, queries, records, bloomTime, totalTime) {
            document.getElementById('bloomChecks').textContent = totalBloomChecks;
            document.getElementById('dbQueries').textContent = totalQueries;
            document.getElementById('recordsScanned').textContent = totalRecordsScanned;
            document.getElementById('bloomTime').textContent = `${bloomTime.toFixed(3)}ms`;
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

            // Clear previous Bloom result
            document.getElementById('bloomResult').innerHTML = '';

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
                    if (result.bloomOptimized) {
                        showMessage(result.message + ' (Optimized by Bloom Filter - no database query needed!)', false);
                    } else {
                        showMessage(result.message, false);
                    }
                }
            } catch (error) {
                showMessage('An error occurred during authentication.', false);
                console.error('Authentication error:', error);
            }

            // Re-enable button
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        });

        // Initialize displays
        updateBloomInfo();
        updateMetrics(0, 0, 0, 0, 0);