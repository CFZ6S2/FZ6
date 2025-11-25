# SDKs oficiales de Anthropic

A continuación tienes los requisitos mínimos y los pasos de instalación para cada SDK según el lenguaje.

## Java
- **Repositorio:** GitHub de la biblioteca Java.
- **Requisitos:** Java 8 o posterior.
- **Instalación (Gradle):**
  ```gradle
  implementation("com.anthropic:anthropic-java:2.10.0")
  ```
- **Instalación (Maven):**
  ```xml
  <dependency>
      <groupId>com.anthropic</groupId>
      <artifactId>anthropic-java</artifactId>
      <version>2.10.0</version>
  </dependency>
  ```

## Go
- **Repositorio:** GitHub de la biblioteca Go.
- **Requisitos:** Go 1.22+.
- **Instalación:**
  ```bash
  go get -u 'github.com/anthropics/anthropic-sdk-go@v1.17.0'
  ```

## C#
- **Repositorio:** GitHub de la biblioteca de C# (beta).
- **Requisitos:** .NET 8 o posterior.
- **Instalación:**
  ```bash
  dotnet add package Anthropic
  ```

## Ruby
- **Repositorio:** GitHub de la biblioteca Ruby.
- **Requisitos:** Ruby 3.2.0 o posterior.
- **Instalación:**
  1. Agrega al `Gemfile`:
     ```ruby
     gem "anthropic", "~> 1.13.0"
     ```
  2. Instala dependencias:
     ```bash
     bundle install
     ```

## PHP
- **Repositorio:** GitHub de la biblioteca PHP (beta).
- **Requisitos:** PHP 8.1.0 o superior.
- **Instalación:**
  ```bash
  composer require "anthropic-ai/sdk 0.3.0"
  ```

## Funciones en beta
Cada SDK expone un espacio de nombres **`beta`** para acceder a funciones nuevas. Debes usarlo junto con los encabezados beta según la guía de cada repositorio.
