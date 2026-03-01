/**
 * ================================================================================================
 * ICON MANAGER MODAL BODY - Компонент управления иконками в модальном окне
 * ================================================================================================
 *
 * Skill: app/skills/ui-architecture
 */

(function() {
    'use strict';

    console.log('icon-manager-modal-body.js: загрузка компонента...');

    window.cmpIconManagerModalBody = {
        template: '#icon-manager-modal-body-template',

        inject: ['modalApi'],

        props: {
            // Данные монеты: { id, symbol, name, image, fallbackImage }
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
            // Формируем имя файла for сохранения
            targetFilename() {
                const alias = window.iconManager?.CONFIG?.aliasMap[this.coinData.id];
                return (alias || this.coinData.id) + '.png';
            }
        },

        watch: {
            // Обновляем состояние кнопок при изменении готовности изображения
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

            // По умолчанию подгружаем текущую иконку в предпросмотр
            if (this.coinData.fallbackImage) {
                this.loadFromUrl(this.coinData.fallbackImage, true).then(() => {
                    // После загрузки CG иконки в канвас, кнопка "Опубликовать" должна стать активной
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
             * Регистрация кнопок в футере модального окна
             */
            registerModalButtons() {
                if (!this.modalApi) return;

                const hasImage = !!this.imageBlob;

                // Кнопка "Скачать"
                this.modalApi.registerButton('download', {
                    label: 'Скачать',
                    icon: 'fas fa-download',
                    variant: 'outline-secondary',
                    locations: ['footer'],
                    classesAdd: { root: 'me-auto' }, // Слева
                    disabled: !hasImage,
                    onClick: () => this.downloadIcon()
                });

                // Кнопка "Опубликовать"
                this.modalApi.registerButton('publish', {
                    label: 'Опубликовать в libs',
                    icon: 'fas fa-cloud-upload-alt',
                    variant: 'primary',
                    locations: ['footer'],
                    disabled: !hasImage || !this.githubToken || this.isUploading,
                    onClick: () => this.handlePublish()
                });
            },

            /**
             * Обработка публикации (с подтверждением если перезаписываем)
             */
            async handlePublish() {
                if (!this.imageBlob || !this.githubToken) return;

                // Проверяем, отличается ли новая иконка от актуальной (визуально не можем, но можем по факту наличия)
                await this.uploadToGithub();
            },

            /**
             * Обновление состояния кнопок
             */
            updateModalButtons() {
                if (!this.modalApi) return;

                this.modalApi.updateButton('download', {
                    disabled: !this.imageBlob
                });

                this.modalApi.updateButton('publish', {
                    disabled: !this.imageBlob || !this.githubToken || this.isUploading,
                    label: this.isUploading ? 'Загрузка...' : 'Опубликовать в libs',
                    icon: this.isUploading ? 'spinner-border spinner-border-sm' : 'fas fa-cloud-upload-alt'
                });
            },

            /**
             * Сохранить GitHub Token
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
             * Загрузить изображение по URL (через прокси for CORS bypass)
             * @param {string} url - Опциональный URL (если не указан, берется из externalUrl)
             * @param {boolean} skipInputUpdate - Не обновлять поле ввода
             */
            async loadFromUrl(url = null, skipInputUpdate = false) {
                const targetUrl = url || this.externalUrl;
                if (!targetUrl) return;

                try {
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

                    // Не показываем ошибку при автоматической загрузке текущей иконки
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
             * Обработка Drag & Drop
             */
            handleFileDrop(event) {
                this.isDragging = false;
                const files = event.dataTransfer.files;
                if (files.length > 0) {
                    this.processImage(files[0]);
                }
            },

            /**
             * Выбор файла через input
             */
            handleFileSelect(event) {
                const files = event.target.files;
                if (files.length > 0) {
                    this.processImage(files[0]);
                }
            },

            /**
             * Обработка изображения через Canvas (ресайз до 128x128)
             */
            processImage(fileOrBlob) {
                const img = new Image();
                const url = URL.createObjectURL(fileOrBlob);

                img.onload = () => {
                    const canvas = this.$refs.iconCanvas;
                    if (!canvas) {
                        // Если канвас еще не отрисован Vue, подождем
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

                // Очистка
                ctx.clearRect(0, 0, 128, 128);

                // Вычисляем пропорции for вписывания (contain)
                const scale = Math.min(128 / img.width, 128 / img.height);
                const x = (128 - img.width * scale) / 2;
                const y = (128 - img.height * scale) / 2;

                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                // Сохраняем результат как Blob
                canvas.toBlob((blob) => {
                    this.imageBlob = blob;
                }, 'image/png');
            },

            /**
             * Загрузка в GitHub через API
             */
            async uploadToGithub() {
                if (!this.imageBlob || !this.githubToken) return;

                this.isUploading = true;

                try {
                    // Конвертируем Blob в Base64 for GitHub API
                    const reader = new FileReader();
                    const base64Promise = new Promise((resolve) => {
                        reader.onloadend = () => resolve(reader.result.split(',')[1]);
                        reader.readAsDataURL(this.imageBlob);
                    });

                    const content = await base64Promise;
                    const repo = 'aoponomarev/libs'; // Ваш репозиторий с ассетами
                    const path = `assets/coins/${this.targetFilename}`;
                    const url = `https://api.github.com/repos/${repo}/contents/${path}`;

                    // 1. Сначала пытаемся получить SHA файла, если он уже существует
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

                    // 2. Отправляем файл
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
             * Скачать файл локально (fallback вариант)
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

    console.log('icon-manager-modal-body.js: loaded');
})();
