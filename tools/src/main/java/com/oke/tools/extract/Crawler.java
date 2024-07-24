package com.oke.tools.extract;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Scanner;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Scraper class to fetch and display data from a given URL.
 */
public class Crawler {

	private static final  ObjectMapper MAPPER = new ObjectMapper();
	private static String URL_STRING;
	private static final Scanner SCANNER = new Scanner(System.in);

	public static void main(String[] args) {

		try {
			System.out.println("Enter the Url: ");
			URL_STRING = SCANNER.nextLine();
			URL jsonUrl = new URL(URL_STRING);
			JsonNode jsonNode = MAPPER.readTree(jsonUrl);
			processJson(jsonNode);

		} catch (MalformedURLException e) {
			System.err.println("The URL provided is malformed: " + URL_STRING);
			e.printStackTrace();
		} catch (IOException e) {
			System.err.println("An error occured while reading the JSON from the URL: " + URL_STRING);
			e.printStackTrace();
		}

	}

	/**
	 * Processes the JSON node and prints the formated data
	 * 
	 * @param jsonNode the JSON node to process
	 */
	private static void processJson(JsonNode jsonNode) {
		for(JsonNode node : jsonNode) {
			String name = node.get("TeamName").textValue();
			String divName = node.get("DivName").textValue();
			int wins = node.get("Wins").intValue();
			int losses = node.get("Losses").intValue();
			int ties = node.get("Ties").intValue();
			int gamesPlayed = node.get("GamesPlayed").intValue();
			int points = node.get("Points").intValue();
			int goalsFor = node.get("GF").intValue();
			int goalsAgainst = node.get("GA").intValue();
			int goalDifference = node.get("PlusMinus").intValue();

			System.out.format("('%s', '%s', %s, %s, %s, %s, %s, %s, %s, %s),\n", name, divName, wins, losses, ties, gamesPlayed, points, goalsFor, goalsAgainst, goalDifference);
		}
	}

}
