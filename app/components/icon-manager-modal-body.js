/**
 * #JS-WK5L8WFt
 * @description Icon management in modal; GitHub token, coin icons upload.
 * @skill id:sk-318305
 */

(function() {
    'use strict';

    console.log('icon-manager-modal-body.js: loading component...');

    window.cmpIconManagerModalBody = {
        template: '#icon-manager-modal-body-template',

        inject: ['modalApi'],

        props: {
            // Coin data: { id, symbol, name, image, fallbackImage }
            coinData: {
                type: Object,
                required: true
            }
        },

        data() {
            return {
                githubToken: localStorage.getItem('app_github_token') || '',
                tokenInput: '',
                externalUrl: '',
                previewUrl: '',
                isDragging: false,
                isUploading: false,
                filename: '',
                imageBlob: null
            };
        },

        computed: {
            // Build filename for saving
            targetFilename() {
                const alias = window.iconManager?.CONFIG?.aliasMap[this.coinData.id];
                return (alias || this.coinData.id) + '.png';
            }
        },

        watch: {
            // Update button state when image readiness changes
            imageBlob(newVal) {
                this.updateModalButtons();
            },
            githubToken(newVal) {
                this.updateModalButtons();
            },
            isUploading(newVal) {
                this.updateModalButtons();
            }
        },

        mounted() {
            this.filename = this.targetFilename;
            this.registerModalButtons();

            // By default load current icon into preview
            if (this.coinData.fallbackImage) {
                this.loadFromUrl(this.coinData.fallbackImage, true).then(() => {
                    // After loading CG icon to canvas, Publish button should become active
                    this.updateModalButtons();
                });
            }
        },

        beforeUnmount() {
            if (this.modalApi) {
                this.modalApi.removeButton('publish');
                this.modalApi.removeButton('download');
            }
        },

        methods: {
            /**
             * Register buttons in modal footer
             */
            registerModalButtons() {
                if (!this.modalApi) return;

                const hasImage = !!this.imageBlob;

                // Download button
                this.modalApi.registerButton('download', {
                    label: 'Скачать',
                    icon: 'fas fa-download',
                    variant: 'outline-secondary',
                    locations: ['footer'],
                    classesAdd: { root: 'me-auto' }, // Left
                    disabled: !hasImage,
                    onClick: () => this.downloadIcon()
                });

                // Publish button
                this.modalApi.registerButton('publish', {
                    label: 'Опубликовать в a',
                    icon: 'fas fa-cloud-upload-alt',
                    variant: 'primary',
                    locations: ['footer'],
                    disabled: !hasImage || !this.githubToken || this.isUploading,
                    onClick: () => this.handlePublish()
                });
            },

            /**
             * Handle publish (with confirmation if overwriting)
             */
            async handlePublish() {
                if (!this.imageBlob || !this.githubToken) return;

                // Check if new icon differs from current (cannot compare visually, but can by presence)
                await this.uploadToGithub();
            },

            /**
             * Update button state
             */
            updateModalButtons() {
                if (!this.modalApi) return;

                this.modalApi.updateButton('download', {
                    disabled: !this.imageBlob
                });

                this.modalApi.updateButton('publish', {
                    disabled: !this.imageBlob || !this.githubToken || this.isUploading,
                    label: this.isUploading ? 'Загрузка...' : 'Опубликовать в a',
                    icon: this.isUploading ? 'spinner-border spinner-border-sm' : 'fas fa-cloud-upload-alt'
                });
            },

            /**
             * Save GitHub Token
             */
            saveToken() {
                if (this.tokenInput) {
                    localStorage.setItem('app_github_token', this.tokenInput);
                    this.githubToken = this.tokenInput;
                    this.tokenInput = '';

                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'success',
                            text: 'GitHub Token успешно сохранен',
                            scope: 'global'
                        });
                    }
                }
            },

            /**
             * Load image by URL (via proxy for CORS bypass)
             * @param {string} url - Optional URL (if not set, taken from externalUrl)
             * @param {boolean} skipInputUpdate - Do not update input field
             */
            async loadFromUrl(url = null, skipInputUpdate = false) {
                const targetUrl = url || this.externalUrl;
                if (!targetUrl) return;

                try {
                    // @causality #for-ais-rollout-gap-marking
                    // Transitional deviation from AIS target state: icon loading still
                    // calls the generic proxy directly from the component until this
                    // transport is extracted into a dedicated facade/client.
                    const proxyUrl = window.cloudflareConfig?.getGenericProxyUrl(targetUrl);
                    const response = await fetch(proxyUrl);

                    if (!response.ok) throw new Error('Ошибка загрузки через прокси');

                    const blob = await response.blob();
                    this.processImage(blob);

                    if (!skipInputUpdate && url) {
                        this.externalUrl = url;
                    }
                } catch (error) {
                    console.error('icon-manager: ошибка загрузки URL:', error);

                    // Do not show error on automatic load of current icon
                    if (!skipInputUpdate && window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'danger',
                            text: 'Не удалось подгрузить иконку по URL. Проверьте адрес.',
                            scope: 'global'
                        });
                    }
                }
            },

            /**
             * Handle Drag & Drop
             */
            handleFileDrop(event) {
                this.isDragging = false;
                const files = event.dataTransfer.files;
                if (files.length > 0) {
                    this.processImage(files[0]);
                }
            },

            /**
             * File selection via input
             */
            handleFileSelect(event) {
                const files = event.target.files;
                if (files.length > 0) {
                    this.processImage(files[0]);
                }
            },

            /**
             * Process image via Canvas (resize to 128x128)
             */
            processImage(fileOrBlob) {
                const img = new Image();
                const url = URL.createObjectURL(fileOrBlob);

                img.onload = () => {
                    const canvas = this.$refs.iconCanvas;
                    if (!canvas) {
                        // If canvas not yet rendered by Vue, wait
                        this.previewUrl = url;
                        this.$nextTick(() => this.drawOnCanvas(img));
                        return;
                    }
                    this.drawOnCanvas(img);
                    URL.revokeObjectURL(url);
                };

                img.src = url;
                this.previewUrl = url;
            },

            drawOnCanvas(img) {
                const canvas = this.$refs.iconCanvas;
                const ctx = canvas.getContext('2d');

                // Clear
                ctx.clearRect(0, 0, 128, 128);

                // Calculate scale for contain fit
                const scale = Math.min(128 / img.width, 128 / img.height);
                const x = (128 - img.width * scale) / 2;
                const y = (128 - img.height * scale) / 2;

                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                // Save result as Blob
                canvas.toBlob((blob) => {
                    this.imageBlob = blob;
                }, 'image/png');
            },

            /**
             * Upload to GitHub via API
             */
            async uploadToGithub() {
                if (!this.imageBlob || !this.githubToken) return;

                this.isUploading = true;

                try {
                    // @causality #for-ais-rollout-gap-marking
                    // Transitional deviation from AIS target state: GitHub Contents API
                    // transport is still owned by this component for backward-compatible
                    // icon publishing until a dedicated integration facade is introduced.
                    // Convert Blob to Base64 for GitHub API
                    const reader = new FileReader();
                    const base64Promise = new Promise((resolve) => {
                        reader.onloadend = () => resolve(reader.result.split(',')[1]);
                        reader.readAsDataURL(this.imageBlob);
                    });

                    const content = await base64Promise;
                    const repo = 'aoponomarev/a'; // Asset repository
                    const path = `coins/${this.targetFilename}`;
                    const url = `https://api.github.com/repos/${repo}/contents/${path}`;

                    // 1. First try to get file SHA if it already exists
                    let sha = null;
                    try {
                        const checkRes = await fetch(url, {
                            headers: { 'Authorization': `token ${this.githubToken}` }
                        });
                        if (checkRes.ok) {
                            const fileData = await checkRes.json();
                            sha = fileData.sha;
                        }
                    } catch (e) {}

                    // 2. Upload file
                    const res = await fetch(url, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `token ${this.githubToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: `Update icon for ${this.coinData.id} (automated via app)`,
                            content: content,
                            sha: sha
                        })
                    });

                    if (!res.ok) {
                        const errorData = await res.json();
                        throw new Error(errorData.message || 'Ошибка API GitHub');
                    }

                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'success',
                            text: `Иконка ${this.targetFilename} успешно опубликована! Изменения появятся через пару минут.`,
                            scope: 'global',
                            duration: 5000
                        });
                    }
                } catch (error) {
                    console.error('icon-manager: ошибка загрузки в GitHub:', error);

                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'danger',
                            text: `Ошибка публикации: ${error.message}`,
                            scope: 'global'
                        });
                    }
                } finally {
                    this.isUploading = false;
                }
            },

            /**
             * Download file locally (fallback)
             */
            downloadIcon() {
                if (!this.imageBlob) return;
                const url = URL.createObjectURL(this.imageBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = this.targetFilename;
                a.click();
                URL.revokeObjectURL(url);
            }
        }
    };

    console.log('icon-manager-modal-body.js: loaded.');
})();
