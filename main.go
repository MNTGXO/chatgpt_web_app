package main

import (
  "bytes"
  "encoding/json"
  "io"
  "log"
  "net/http"
  "os"

  "github.com/gorilla/mux"
)

type ChatRequest struct {
  Prompt string `json:"prompt"`
}

type APIMessage struct {
  Role    string `json:"role"`
  Content string `json:"content"`
}

type APIRequest struct {
  Messages []APIMessage `json:"messages"`
  Stream   bool         `json:"stream"`
}

type APIChoice struct {
  Message APIMessage `json:"message"`
}

type APIResponse struct {
  Choices []APIChoice `json:"choices"`
}

type ChatResponse struct {
  Response string `json:"response"`
}

func chatHandler(w http.ResponseWriter, r *http.Request) {
  if r.Method != http.MethodPost {
    http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    return
  }

  var req ChatRequest
  if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Prompt == "" {
    http.Error(w, "Invalid request payload", http.StatusBadRequest)
    return
  }

  apiReq := APIRequest{Messages: []APIMessage{{Role: "user", Content: req.Prompt}}, Stream: false}
  body, _ := json.Marshal(apiReq)

  resp, err := http.Post("https://mnbots-api.vercel.app/chat", "application/json", bytes.NewReader(body))
  if err != nil {
    http.Error(w, "Failed to reach API", http.StatusInternalServerError)
    return
  }
  defer resp.Body.Close()

  if resp.StatusCode != http.StatusOK {
    io.Copy(w, resp.Body)
    return
  }

  var apiResp APIResponse
  if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
    http.Error(w, "Invalid API response", http.StatusInternalServerError)
    return
  }

  out := ChatResponse{Response: apiResp.Choices[0].Message.Content}
  w.Header().Set("Content-Type", "application/json")
  json.NewEncoder(w).Encode(out)
}

func main() {
  r := mux.NewRouter()
  r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./static"))))
  r.HandleFunc("/chat", chatHandler).Methods("POST")
  r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    http.ServeFile(w, r, "./static/index.html")
  })

  port := os.Getenv("PORT")
  if port == "" {
    port = "8080"
  }
  log.Printf("Listening on :%s...", port)
  log.Fatal(http.ListenAndServe(":"+port, r))
}
