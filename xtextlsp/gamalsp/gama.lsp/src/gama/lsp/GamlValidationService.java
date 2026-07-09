/*******************************************************************************************************
 *
 * GamlValidationService.java, in gama.lsp, is part of the source code of the GAMA modeling and simulation
 * platform (v.2025-03).
 *
 * (c) 2007-2025 UMI 209 UMMISCO IRD/SU & Partners (IRIT, MIAT, ESPACE-DEV, CTU)
 *
 * Visit https://github.com/gama-platform/gama for license information and contacts.
 *
 ********************************************************************************************************/
package gama.lsp;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.eclipse.emf.common.util.URI;
import org.eclipse.xtext.nodemodel.util.NodeModelUtils;

import com.google.inject.Injector;

import gama.api.constants.GamlFileExtension;
import gama.api.compilation.GamlCompilationError;
import gaml.compiler.validation.GamlModelBuilder;

/**
 * Service that validates GAML files and produces JSON diagnostics.
 * Used by the LSP-like validation server and one-shot validation.
 */
public class GamlValidationService {

	private final Injector injector;

	public GamlValidationService(final Injector injector) {
		this.injector = injector;
	}

	/**
	 * Validate a single GAML file and return JSON diagnostics.
	 */
	public String validateGamlFile(final String pathToGamlFile) {
		if (!GamlFileExtension.isGaml(pathToGamlFile)) {
			return buildErrorJson(pathToGamlFile, "Not a GAML file");
		}

		final GamlModelBuilder builder = new GamlModelBuilder(injector);
		final List<GamlCompilationError> errors = new ArrayList<>();
		URI uri;
		try {
			uri = URI.createFileURI(pathToGamlFile);
		} catch (Exception e) {
			uri = URI.createURI(pathToGamlFile);
		}

		builder.compile(uri, errors);

		return buildValidationJson(pathToGamlFile, errors);
	}

	/**
	 * Runs a persistent validation server reading file paths from stdin and
	 * writing JSON diagnostics to stdout. Stays alive until stdin is closed
	 * or "exit" is received.
	 */
	public void runValidationServer() {
		try (BufferedReader reader = new BufferedReader(new InputStreamReader(System.in))) {
			String line;
			while ((line = reader.readLine()) != null) {
				line = line.trim();
				if (line.isEmpty() || "exit".equals(line)) break;

				final String pathToGamlFile = line;
				if (!GamlFileExtension.isGaml(pathToGamlFile)) {
					System.out.println(buildErrorJson(pathToGamlFile, "Not a GAML file"));
					System.out.flush();
					continue;
				}

				String result;
				try {
					final GamlModelBuilder builder = new GamlModelBuilder(injector);
					final List<GamlCompilationError> errors = new ArrayList<>();
					URI uri;
					try {
						uri = URI.createFileURI(pathToGamlFile);
					} catch (Exception e) {
						uri = URI.createURI(pathToGamlFile);
					}
					builder.compile(uri, errors);
					result = buildValidationJson(pathToGamlFile, errors);
				} catch (Exception e) {
					e.printStackTrace();
					result = buildErrorJson(pathToGamlFile,
							e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
				}
				System.out.println(result);
				System.out.flush();
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	private String buildValidationJson(final String pathToGamlFile, final List<GamlCompilationError> errors) {
		StringBuilder json = new StringBuilder();
		json.append("{");
		json.append("\"file\": \"").append(escapeJson(pathToGamlFile)).append("\",");
		json.append("\"diagnostics\": [");

		for (int i = 0; i < errors.size(); i++) {
			GamlCompilationError error = errors.get(i);
			json.append("{");
			json.append("\"severity\": \"")
					.append(error.isError() ? "error" : (error.isWarning() ? "warning" : "info")).append("\",");
			json.append("\"message\": \"").append(escapeJson(error.toString())).append("\",");

			int line = 1;
			try {
				if (error.source() != null) {
					org.eclipse.xtext.nodemodel.ICompositeNode node =
							NodeModelUtils.getNode(error.source());
					if (node != null) { line = node.getStartLine(); }
				}
				// Xtext syntax diagnostics embed the true line in toString() as "TYPE: URI:LINE".
				// When URI is null (temporary resource), match "null:LINE" from the message.
				Matcher m = Pattern.compile("null:(\\d+)\\s").matcher(error.message());
				if (m.find()) { line = Integer.parseInt(m.group(1)); }
			} catch (Exception e) {}
			json.append("\"line\": ").append(line);
			json.append("}");
			if (i < errors.size() - 1) { json.append(","); }
		}
		json.append("]");
		json.append("}");
		return json.toString();
	}

	private String buildErrorJson(final String pathToGamlFile, final String message) {
		StringBuilder err = new StringBuilder();
		err.append("{\"file\": \"").append(escapeJson(pathToGamlFile)).append("\",");
		err.append("\"diagnostics\": [{\"severity\": \"error\", \"message\": \"")
				.append(escapeJson(message)).append("\", \"line\": 1}]}");
		return err.toString();
	}

	private static String escapeJson(String s) {
		if (s == null) return "";
		return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
	}
}
