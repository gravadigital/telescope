package handlers

import (
	"bytes"
	"context"
	"fmt"
	"io"

	"github.com/gravadigital/telescopio-api/internal/storage"
)

var _ storage.FileStorage = (*mockFileStorage)(nil)

// mockFileStorage is an in-memory implementation of storage.FileStorage.
type mockFileStorage struct {
	files       map[string][]byte
	putErr      error
	getErr      error
	deleteErr   error
	deletedKeys []string
}

func newMockFileStorage() *mockFileStorage {
	return &mockFileStorage{files: make(map[string][]byte)}
}

func (m *mockFileStorage) Put(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (string, error) {
	if m.putErr != nil {
		return "", m.putErr
	}
	data, err := io.ReadAll(reader)
	if err != nil {
		return "", err
	}
	m.files[key] = data
	return key, nil
}

func (m *mockFileStorage) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	if m.getErr != nil {
		return nil, m.getErr
	}
	data, ok := m.files[key]
	if !ok {
		return nil, fmt.Errorf("file not found: %s", key)
	}
	return io.NopCloser(bytes.NewReader(data)), nil
}

func (m *mockFileStorage) Delete(ctx context.Context, key string) error {
	if m.deleteErr != nil {
		return m.deleteErr
	}
	m.deletedKeys = append(m.deletedKeys, key)
	delete(m.files, key)
	return nil
}

func (m *mockFileStorage) GetURL(ctx context.Context, key string) (string, error) {
	return "https://example.com/" + key, nil
}

func (m *mockFileStorage) Exists(ctx context.Context, key string) (bool, error) {
	_, ok := m.files[key]
	return ok, nil
}

func (m *mockFileStorage) GetInfo(ctx context.Context, key string) (*storage.FileInfo, error) {
	data, ok := m.files[key]
	if !ok {
		return nil, fmt.Errorf("file not found: %s", key)
	}
	return &storage.FileInfo{Key: key, Size: int64(len(data))}, nil
}
